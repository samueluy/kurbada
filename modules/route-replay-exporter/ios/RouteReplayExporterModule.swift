import AVFoundation
import ExpoModulesCore
import UIKit

public class RouteReplayExporterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RouteReplayExporter")

    AsyncFunction("exportFramesAsync") { (
      frameUris: [String],
      width: Int,
      height: Int,
      fps: Int,
      bitRate: Int?,
      outputFileName: String?
    ) throws -> String in
      try self.exportFrames(
        frameUris: frameUris,
        width: width,
        height: height,
        fps: fps,
        bitRate: bitRate ?? max(width * height * 6, 4_000_000),
        outputFileName: outputFileName ?? "route-replay-\(UUID().uuidString).mp4"
      )
    }
  }

  private func exportFrames(
    frameUris: [String],
    width: Int,
    height: Int,
    fps: Int,
    bitRate: Int,
    outputFileName: String
  ) throws -> String {
    guard !frameUris.isEmpty else {
      throw NSError(domain: "RouteReplayExporter", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "At least one frame is required to export route replay."
      ])
    }

    let outputUrl = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(outputFileName)
    if FileManager.default.fileExists(atPath: outputUrl.path) {
      try FileManager.default.removeItem(at: outputUrl)
    }

    let writer = try AVAssetWriter(outputURL: outputUrl, fileType: .mp4)
    let settings: [String: Any] = [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: width,
      AVVideoHeightKey: height,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: bitRate,
        AVVideoExpectedSourceFrameRateKey: fps,
        AVVideoMaxKeyFrameIntervalKey: fps
      ]
    ]

    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    writerInput.expectsMediaDataInRealTime = false

    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: writerInput,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
      ]
    )

    guard writer.canAdd(writerInput) else {
      throw NSError(domain: "RouteReplayExporter", code: 2, userInfo: [
        NSLocalizedDescriptionKey: "Could not configure video writer input."
      ])
    }

    writer.add(writerInput)
    guard writer.startWriting() else {
      throw writer.error ?? NSError(domain: "RouteReplayExporter", code: 3, userInfo: [
        NSLocalizedDescriptionKey: "Could not start MP4 writing."
      ])
    }

    writer.startSession(atSourceTime: .zero)
    let frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps))

    for (index, frameUri) in frameUris.enumerated() {
      let frameUrl = URL(string: frameUri)?.isFileURL == true
        ? URL(string: frameUri)
        : URL(fileURLWithPath: frameUri.replacingOccurrences(of: "file://", with: ""))

      guard
        let safeFrameUrl = frameUrl,
        let image = UIImage(contentsOfFile: safeFrameUrl.path)
      else {
        continue
      }

      while !writerInput.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.002)
      }

      guard let pixelBufferPool = adaptor.pixelBufferPool else {
        throw NSError(domain: "RouteReplayExporter", code: 4, userInfo: [
          NSLocalizedDescriptionKey: "Could not access video pixel buffer pool."
        ])
      }

      let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(index))
      let pixelBuffer = try makePixelBuffer(from: image, width: width, height: height, pool: pixelBufferPool)
      guard adaptor.append(pixelBuffer, withPresentationTime: presentationTime) else {
        throw writer.error ?? NSError(domain: "RouteReplayExporter", code: 5, userInfo: [
          NSLocalizedDescriptionKey: "Could not append a replay frame to the video."
        ])
      }
    }

    writerInput.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    var finishError: Error?
    writer.finishWriting {
      finishError = writer.error
      semaphore.signal()
    }
    semaphore.wait()

    if let finishError {
      throw finishError
    }

    return outputUrl.absoluteString
  }

  private func makePixelBuffer(from image: UIImage, width: Int, height: Int, pool: CVPixelBufferPool) throws -> CVPixelBuffer {
    var maybeBuffer: CVPixelBuffer?
    let result = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &maybeBuffer)
    guard result == kCVReturnSuccess, let pixelBuffer = maybeBuffer else {
      throw NSError(domain: "RouteReplayExporter", code: 6, userInfo: [
        NSLocalizedDescriptionKey: "Could not allocate a replay frame buffer."
      ])
    }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

    guard
      let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
      )
    else {
      throw NSError(domain: "RouteReplayExporter", code: 7, userInfo: [
        NSLocalizedDescriptionKey: "Could not create a replay drawing context."
      ])
    }

    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    context.interpolationQuality = .high
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)

    if let cgImage = image.cgImage {
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    }

    return pixelBuffer
  }
}

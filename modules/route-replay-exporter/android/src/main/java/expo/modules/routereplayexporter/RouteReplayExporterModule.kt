package expo.modules.routereplayexporter

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.max

class RouteReplayExporterModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RouteReplayExporter")

    AsyncFunction("exportFramesAsync") { frameUris: List<String>, width: Int, height: Int, fps: Int, bitRate: Int?, outputFileName: String? ->
      exportFrames(
        frameUris = frameUris,
        width = width,
        height = height,
        fps = fps,
        bitRate = bitRate ?: max(width * height * 6, 4_000_000),
        outputFileName = outputFileName ?: "route-replay-${System.currentTimeMillis()}.mp4"
      )
    }
  }

  private fun exportFrames(
    frameUris: List<String>,
    width: Int,
    height: Int,
    fps: Int,
    bitRate: Int,
    outputFileName: String
  ): String {
    if (frameUris.isEmpty()) {
      throw IllegalArgumentException("At least one frame is required to export route replay.")
    }

    val context = appContext.reactContext ?: throw IllegalStateException("Android context unavailable.")
    val outputFile = File(context.cacheDir, outputFileName)
    if (outputFile.exists()) {
      outputFile.delete()
    }

    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    val colorFormat = selectColorFormat(codec.codecInfo)
    val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, colorFormat)
      setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
      setInteger(MediaFormat.KEY_FRAME_RATE, fps)
      setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
    }

    codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    codec.start()

    val muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    val bufferInfo = MediaCodec.BufferInfo()
    var trackIndex = -1
    var muxerStarted = false
    val frameDurationUs = 1_000_000L / fps

    try {
      frameUris.forEachIndexed { index, frameUri ->
        val bitmap = decodeFrame(frameUri)
        val scaledBitmap = if (bitmap.width != width || bitmap.height != height) {
          Bitmap.createScaledBitmap(bitmap, width, height, true)
        } else {
          bitmap
        }

        val yuvBuffer = when (colorFormat) {
          MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar -> toYuv420Planar(scaledBitmap)
          else -> toYuv420SemiPlanar(scaledBitmap)
        }

        if (scaledBitmap !== bitmap) {
          bitmap.recycle()
        }
        scaledBitmap.recycle()

        var queued = false
        while (!queued) {
          val inputIndex = codec.dequeueInputBuffer(10_000)
          if (inputIndex >= 0) {
            codec.getInputBuffer(inputIndex)?.apply {
              clear()
              put(yuvBuffer)
            }
            codec.queueInputBuffer(
              inputIndex,
              0,
              yuvBuffer.size,
              index * frameDurationUs,
              0
            )
            queued = true
          }
          val drainResult = drainEncoder(codec, muxer, bufferInfo, trackIndex, muxerStarted, false)
          trackIndex = drainResult.trackIndex
          muxerStarted = drainResult.muxerStarted
        }
      }

      var eosQueued = false
      while (!eosQueued) {
        val inputIndex = codec.dequeueInputBuffer(10_000)
        if (inputIndex >= 0) {
          codec.queueInputBuffer(inputIndex, 0, 0, frameUris.size * frameDurationUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
          eosQueued = true
        }
        val drainResult = drainEncoder(codec, muxer, bufferInfo, trackIndex, muxerStarted, false)
        trackIndex = drainResult.trackIndex
        muxerStarted = drainResult.muxerStarted
      }

      var endOfStream = false
      while (!endOfStream) {
        val drainResult = drainEncoder(codec, muxer, bufferInfo, trackIndex, muxerStarted, true)
        trackIndex = drainResult.trackIndex
        muxerStarted = drainResult.muxerStarted
        endOfStream = drainResult.endOfStream
      }
    } finally {
      try {
        codec.stop()
      } catch (_: Throwable) {
      }
      codec.release()
      try {
        muxer.stop()
      } catch (_: Throwable) {
      }
      muxer.release()
    }

    return outputFile.toURI().toString()
  }

  private fun decodeFrame(frameUri: String): Bitmap {
    val normalized = frameUri.removePrefix("file://")
    return BitmapFactory.decodeFile(normalized)
      ?: throw IllegalStateException("Could not decode replay frame at $frameUri")
  }

  private fun selectColorFormat(codecInfo: MediaCodecInfo): Int {
    val caps = codecInfo.getCapabilitiesForType(MediaFormat.MIMETYPE_VIDEO_AVC)
    val preferred = listOf(
      MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar,
      MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar,
      MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible,
    )

    preferred.forEach { format ->
      if (caps.colorFormats.contains(format)) {
        return format
      }
    }

    throw IllegalStateException("No supported YUV420 color format found for H.264 encoding.")
  }

  private data class DrainResult(
    val trackIndex: Int,
    val muxerStarted: Boolean,
    val endOfStream: Boolean,
  )

  private fun drainEncoder(
    codec: MediaCodec,
    muxer: MediaMuxer,
    bufferInfo: MediaCodec.BufferInfo,
    currentTrackIndex: Int,
    currentMuxerStarted: Boolean,
    forceEndOfStream: Boolean,
  ): DrainResult {
    var trackIndex = currentTrackIndex
    var muxerStarted = currentMuxerStarted

    while (true) {
      val outputIndex = codec.dequeueOutputBuffer(bufferInfo, if (forceEndOfStream) 10_000 else 0)
      when {
        outputIndex == MediaCodec.INFO_TRY_AGAIN_LATER -> {
          return DrainResult(trackIndex, muxerStarted, false)
        }
        outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
          trackIndex = muxer.addTrack(codec.outputFormat)
          muxer.start()
          muxerStarted = true
        }
        outputIndex >= 0 -> {
          val outputBuffer = codec.getOutputBuffer(outputIndex)
            ?: throw IllegalStateException("Could not access encoded replay output buffer.")

          if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) {
            bufferInfo.size = 0
          }

          if (bufferInfo.size > 0 && muxerStarted) {
            outputBuffer.position(bufferInfo.offset)
            outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
            muxer.writeSampleData(trackIndex, outputBuffer, bufferInfo)
          }

          val endOfStream = bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
          codec.releaseOutputBuffer(outputIndex, false)
          if (endOfStream) {
            return DrainResult(trackIndex, muxerStarted, true)
          }
        }
      }
    }
  }

  private fun toYuv420SemiPlanar(bitmap: Bitmap): ByteArray {
    val width = bitmap.width
    val height = bitmap.height
    val argb = IntArray(width * height)
    bitmap.getPixels(argb, 0, width, 0, 0, width, height)

    val yuv = ByteArray(width * height * 3 / 2)
    var yIndex = 0
    var uvIndex = width * height
    var index = 0

    for (j in 0 until height) {
      for (i in 0 until width) {
        val color = argb[index++]
        val r = color shr 16 and 0xff
        val g = color shr 8 and 0xff
        val b = color and 0xff

        val y = ((66 * r + 129 * g + 25 * b + 128) shr 8) + 16
        val u = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
        val v = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128

        yuv[yIndex++] = clampToByte(y)

        if (j % 2 == 0 && i % 2 == 0) {
          yuv[uvIndex++] = clampToByte(u)
          yuv[uvIndex++] = clampToByte(v)
        }
      }
    }

    return yuv
  }

  private fun toYuv420Planar(bitmap: Bitmap): ByteArray {
    val width = bitmap.width
    val height = bitmap.height
    val argb = IntArray(width * height)
    bitmap.getPixels(argb, 0, width, 0, 0, width, height)

    val frameSize = width * height
    val yuv = ByteArray(frameSize * 3 / 2)
    var yIndex = 0
    var uIndex = frameSize
    var vIndex = frameSize + frameSize / 4
    var index = 0

    for (j in 0 until height) {
      for (i in 0 until width) {
        val color = argb[index++]
        val r = color shr 16 and 0xff
        val g = color shr 8 and 0xff
        val b = color and 0xff

        val y = ((66 * r + 129 * g + 25 * b + 128) shr 8) + 16
        val u = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
        val v = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128

        yuv[yIndex++] = clampToByte(y)

        if (j % 2 == 0 && i % 2 == 0) {
          yuv[uIndex++] = clampToByte(u)
          yuv[vIndex++] = clampToByte(v)
        }
      }
    }

    return yuv
  }

  private fun clampToByte(value: Int): Byte {
    return value.coerceIn(0, 255).toByte()
  }
}

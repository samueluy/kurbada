import { requireNativeModule } from 'expo';

import type { RouteReplayEncoderOptions } from './RouteReplayExporter.types';

type RouteReplayExporterModuleType = {
  exportFramesAsync(
    frameUris: string[],
    width: number,
    height: number,
    fps: number,
    bitRate?: number | null,
    outputFileName?: string | null,
  ): Promise<string>;
};

const RouteReplayExporterModule = requireNativeModule<RouteReplayExporterModuleType>('RouteReplayExporter');

export async function exportRouteReplayAsync(options: RouteReplayEncoderOptions) {
  return RouteReplayExporterModule.exportFramesAsync(
    options.frameUris,
    options.width,
    options.height,
    options.fps,
    options.bitRate ?? null,
    options.outputFileName ?? null,
  );
}

export default RouteReplayExporterModule;

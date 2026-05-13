import { exportRouteReplayAsync as exportRouteReplayFromNative } from '../../modules/route-replay-exporter';

export type RouteReplayExportOptions = {
  frameUris: string[];
  width: number;
  height: number;
  fps: number;
  bitRate?: number;
  outputFileName?: string;
};

export async function exportRouteReplayAsync(options: RouteReplayExportOptions) {
  return exportRouteReplayFromNative(options);
}

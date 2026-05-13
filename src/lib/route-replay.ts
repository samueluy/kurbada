import type { RideRecord, RouteBounds } from '@/types/domain';

export type ReplayPoint = [number, number];

export type ReplayCameraState =
  | {
      mode: 'bounds';
      bounds: RouteBounds;
      padding: { paddingTop: number; paddingBottom: number; paddingLeft: number; paddingRight: number };
      pitch: number;
      heading: number;
    }
  | {
      mode: 'follow';
      centerCoordinate: ReplayPoint;
      zoomLevel: number;
      pitch: number;
      heading: number;
    };

function isReplayPoint(value: unknown): value is ReplayPoint {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]));
}

export function getReplayRouteCoordinates(ride: RideRecord): ReplayPoint[] {
  const routeGeoJson = ride.route_preview_geojson ?? ride.route_geojson;
  if (!routeGeoJson?.geometry?.coordinates) {
    return [];
  }

  return routeGeoJson.geometry.coordinates
    .filter(isReplayPoint)
    .map((point) => [Number(point[0]), Number(point[1])]);
}

export function getInterpolatedRoutePoint(points: ReplayPoint[], progress: number) {
  if (!points.length) {
    return null;
  }
  if (points.length === 1) {
    return { coordinate: points[0], nextCoordinate: points[0], index: 0, localProgress: 0 };
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const localProgress = scaled - index;
  const start = points[index];
  const end = points[index + 1];
  const coordinate: ReplayPoint = [
    start[0] + (end[0] - start[0]) * localProgress,
    start[1] + (end[1] - start[1]) * localProgress,
  ];

  return {
    coordinate,
    nextCoordinate: end,
    index,
    localProgress,
  };
}

export function buildPartialRouteFeature(points: ReplayPoint[], progress: number): GeoJSON.Feature<GeoJSON.LineString> | null {
  const pointState = getInterpolatedRoutePoint(points, progress);
  if (!pointState) {
    return null;
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const coordinates = points.slice(0, pointState.index + 1);
  if (clamped > 0 || !coordinates.length) {
    coordinates.push(pointState.coordinate);
  }

  if (coordinates.length < 2 && points.length >= 2) {
    coordinates.push(points[1]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

export function buildReplayPointFeature(points: ReplayPoint[], progress: number): GeoJSON.Feature<GeoJSON.Point> | null {
  const pointState = getInterpolatedRoutePoint(points, progress);
  if (!pointState) {
    return null;
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: pointState.coordinate,
    },
  };
}

export function getReplayBearing(from: ReplayPoint, to: ReplayPoint) {
  const deltaLng = to[0] - from[0];
  const deltaLat = to[1] - from[1];
  const angle = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function getApproximateZoom(bounds: RouteBounds) {
  const latSpan = Math.abs(bounds.maxLat - bounds.minLat);
  const lngSpan = Math.abs(bounds.maxLng - bounds.minLng);
  const span = Math.max(latSpan, lngSpan);

  if (span < 0.01) return 15.2;
  if (span < 0.02) return 14.5;
  if (span < 0.05) return 13.8;
  if (span < 0.1) return 13.1;
  if (span < 0.2) return 12.4;
  return 11.6;
}

export function getReplayCameraState({
  ride,
  points,
  width,
  progress,
}: {
  ride: RideRecord;
  points: ReplayPoint[];
  width: number;
  progress: number;
}): ReplayCameraState | null {
  if (!points.length) {
    return null;
  }

  const bounds = ride.route_bounds;
  if (
    progress < 0.08
    && bounds
    && Number.isFinite(bounds.minLat)
    && Number.isFinite(bounds.maxLat)
    && Number.isFinite(bounds.minLng)
    && Number.isFinite(bounds.maxLng)
  ) {
    return {
      mode: 'bounds',
      bounds,
      padding: {
        paddingTop: Math.round(width * 0.18),
        paddingBottom: Math.round(width * 0.22),
        paddingLeft: Math.round(width * 0.08),
        paddingRight: Math.round(width * 0.08),
      },
      pitch: 18,
      heading: 0,
    };
  }

  const pointState = getInterpolatedRoutePoint(points, progress);
  if (!pointState) {
    return null;
  }

  const lookaheadIndex = Math.min(points.length - 1, pointState.index + 4);
  const lookahead = points[lookaheadIndex] ?? pointState.nextCoordinate;

  return {
    mode: 'follow',
    centerCoordinate: pointState.coordinate,
    zoomLevel: bounds ? getApproximateZoom(bounds) : 13.2,
    pitch: 44,
    heading: getReplayBearing(pointState.coordinate, lookahead),
  };
}

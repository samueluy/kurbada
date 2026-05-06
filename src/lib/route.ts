import type { RidePoint, RouteBounds } from '@/types/domain';

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(a: RidePoint, b: RidePoint) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const value =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(value));
}

function perpendicularDistance(point: RidePoint, start: RidePoint, end: RidePoint) {
  const x0 = point.longitude;
  const y0 = point.latitude;
  const x1 = start.longitude;
  const y1 = start.latitude;
  const x2 = end.longitude;
  const y2 = end.latitude;

  const numerator = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function rdp(points: RidePoint[], epsilon: number): RidePoint[] {
  if (points.length < 3) {
    return points;
  }

  let index = 0;
  let dmax = 0;

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > dmax) {
      index = i;
      dmax = distance;
    }
  }

  if (dmax > epsilon) {
    const firstHalf = rdp(points.slice(0, index + 1), epsilon);
    const secondHalf = rdp(points.slice(index), epsilon);
    return [...firstHalf.slice(0, -1), ...secondHalf];
  }

  return [points[0], points[points.length - 1]];
}

export function simplifyRoute(points: RidePoint[], epsilonMeters = 5) {
  const epsilonDegrees = epsilonMeters / 111_000;
  return rdp(points, epsilonDegrees);
}

export function buildRouteGeoJson(points: RidePoint[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    },
  };
}

export function computeRouteBounds(points: RidePoint[]): RouteBounds {
  return points.reduce<RouteBounds>(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, point.latitude),
      maxLat: Math.max(bounds.maxLat, point.latitude),
      minLng: Math.min(bounds.minLng, point.longitude),
      maxLng: Math.max(bounds.maxLng, point.longitude),
    }),
    {
      minLat: points[0]?.latitude ?? 0,
      maxLat: points[0]?.latitude ?? 0,
      minLng: points[0]?.longitude ?? 0,
      maxLng: points[0]?.longitude ?? 0,
    },
  );
}

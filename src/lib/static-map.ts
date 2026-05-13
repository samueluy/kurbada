import { env } from '@/lib/env';
import type { RouteBounds } from '@/types/domain';

type LngLat = [number, number];

const MAPBOX_STYLE = 'mapbox/dark-v11';

function isFiniteCoordinatePair(value: unknown): value is LngLat {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]));
}

export function normalizeStaticMapCoordinates(input: unknown, maxPoints = 64): LngLat[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .filter(isFiniteCoordinatePair)
    .map((value) => [Number(value[0]), Number(value[1])] as LngLat);

  if (normalized.length <= maxPoints) {
    return normalized;
  }

  const step = (normalized.length - 1) / (maxPoints - 1);
  const sampled = Array.from({ length: maxPoints }, (_, index) => normalized[Math.round(index * step)]);
  return sampled.filter((value, index) => (
    index === 0
    || value[0] !== sampled[index - 1][0]
    || value[1] !== sampled[index - 1][1]
  ));
}

function encodeOverlayGeoJson(feature: GeoJSON.Feature<GeoJSON.LineString>) {
  return encodeURIComponent(JSON.stringify(feature));
}

function hasValidBounds(bounds?: RouteBounds) {
  return Boolean(
    bounds
    && Number.isFinite(bounds.minLat)
    && Number.isFinite(bounds.maxLat)
    && Number.isFinite(bounds.minLng)
    && Number.isFinite(bounds.maxLng)
    && bounds.minLat !== bounds.maxLat
    && bounds.minLng !== bounds.maxLng,
  );
}

export function getStaticRideMapUrl({
  coordinates,
  width,
  height,
  routeBounds,
}: {
  coordinates: LngLat[];
  width: number;
  height: number;
  routeBounds?: RouteBounds;
}) {
  if (!env.mapboxToken || !coordinates.length) {
    return null;
  }

  const overlayFeature: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {
      stroke: '#E63946',
      'stroke-width': 4,
      'stroke-opacity': 0.92,
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };

  const overlay = `geojson(${encodeOverlayGeoJson(overlayFeature)})`;
  const viewport = hasValidBounds(routeBounds)
    ? 'auto'
    : `${coordinates[0][0]},${coordinates[0][1]},12,0`;

  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/${overlay}/${viewport}/${Math.round(width)}x${Math.round(height)}@2x?padding=28&access_token=${encodeURIComponent(env.mapboxToken)}`;
}

export function getStaticPointMapUrl({
  coordinate,
  width,
  height,
  zoom = 12.5,
}: {
  coordinate?: { lat: number; lng: number } | null;
  width: number;
  height: number;
  zoom?: number;
}) {
  if (!env.mapboxToken || !coordinate) {
    return null;
  }

  const marker = `pin-s+E63946(${coordinate.lng},${coordinate.lat})`;
  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/${marker}/${coordinate.lng},${coordinate.lat},${zoom},0/${Math.round(width)}x${Math.round(height)}@2x?access_token=${encodeURIComponent(env.mapboxToken)}`;
}

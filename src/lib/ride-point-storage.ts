import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

import type { RidePoint } from '@/types/domain';

export type StoredRideSession = {
  rideId: string;
  bikeId: string;
  startedAt: number;
  fuelPricePerLiter: number;
  fuelRateKmPerLiter: number;
  mode: 'hustle' | 'weekend';
  startingAltitude: number | null;
  lastPointTimestamp: number | null;
};

type RidePointRow = {
  ride_id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  speed_kmh: number;
  raw_speed_kmh: number | null;
  location_accuracy_m: number | null;
  altitude: number | null;
};

let db: SQLite.SQLiteDatabase | null = null;
let initialized = false;

function getDatabase() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!db) {
    db = SQLite.openDatabaseSync('kurbada-ride-points.db');
  }

  if (!initialized && db) {
    db.execSync(`
      create table if not exists ride_points (
        ride_id text not null,
        latitude real not null,
        longitude real not null,
        timestamp integer not null,
        speed_kmh real not null default 0,
        raw_speed_kmh real,
        location_accuracy_m real,
        altitude real,
        primary key (ride_id, timestamp)
      );
      create index if not exists ride_points_ride_id_idx on ride_points (ride_id, timestamp asc);
      create table if not exists ride_session_meta (
        key text primary key,
        value text
      );
    `);
    initialized = true;
  }

  return db;
}

function toRow(rideId: string, point: RidePoint): RidePointRow {
  return {
    ride_id: rideId,
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp: point.timestamp,
    speed_kmh: point.speedKmh,
    raw_speed_kmh: point.rawSpeedKmh ?? null,
    location_accuracy_m: point.locationAccuracyM ?? null,
    altitude: point.altitude ?? null,
  };
}

function fromRow(row: RidePointRow): RidePoint {
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
    speedKmh: row.speed_kmh,
    rawSpeedKmh: row.raw_speed_kmh,
    locationAccuracyM: row.location_accuracy_m,
    altitude: row.altitude,
  };
}

const ACTIVE_RIDE_ID_KEY = 'active_ride_id';
const ACTIVE_RIDE_SESSION_KEY = 'active_ride_session';

export async function initializeRidePointStorage() {
  getDatabase();
}

export async function setActiveRidePointSession(rideId: string) {
  const database = getDatabase();
  if (!database) return;
  await database.runAsync(
    'insert into ride_session_meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value',
    [ACTIVE_RIDE_ID_KEY, rideId],
  );
}

export async function getActiveRidePointSession() {
  const database = getDatabase();
  if (!database) return null;
  const row = await database.getFirstAsync<{ value: string }>(
    'select value from ride_session_meta where key = ?',
    [ACTIVE_RIDE_ID_KEY],
  );
  return row?.value ?? null;
}

export async function clearActiveRidePointSession() {
  const database = getDatabase();
  if (!database) return;
  await database.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('delete from ride_session_meta where key = ?', [ACTIVE_RIDE_ID_KEY]);
    await txn.runAsync('delete from ride_session_meta where key = ?', [ACTIVE_RIDE_SESSION_KEY]);
  });
}

export async function setStoredRideSession(session: StoredRideSession) {
  const database = getDatabase();
  if (!database) return;

  const serialized = JSON.stringify(session);
  await database.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      'insert into ride_session_meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value',
      [ACTIVE_RIDE_ID_KEY, session.rideId],
    );
    await txn.runAsync(
      'insert into ride_session_meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value',
      [ACTIVE_RIDE_SESSION_KEY, serialized],
    );
  });
}

export async function getStoredRideSession() {
  const database = getDatabase();
  if (!database) return null as StoredRideSession | null;

  const row = await database.getFirstAsync<{ value: string }>(
    'select value from ride_session_meta where key = ?',
    [ACTIVE_RIDE_SESSION_KEY],
  );
  if (!row?.value) {
    return null;
  }

  try {
    return JSON.parse(row.value) as StoredRideSession;
  } catch {
    return null;
  }
}

export async function updateStoredRideSessionLastPointTimestamp(lastPointTimestamp: number) {
  const currentSession = await getStoredRideSession();
  if (!currentSession) {
    return;
  }

  await setStoredRideSession({
    ...currentSession,
    lastPointTimestamp,
  });
}

export async function clearRidePoints(rideId: string) {
  const database = getDatabase();
  if (!database) return;
  await database.runAsync('delete from ride_points where ride_id = ?', [rideId]);
}

export async function appendRidePoints(rideId: string, points: RidePoint[]) {
  const database = getDatabase();
  if (!database || !points.length) return;

  await database.withExclusiveTransactionAsync(async (txn) => {
    for (const point of points) {
      const row = toRow(rideId, point);
      await txn.runAsync(
        `insert or replace into ride_points
          (ride_id, latitude, longitude, timestamp, speed_kmh, raw_speed_kmh, location_accuracy_m, altitude)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.ride_id,
          row.latitude,
          row.longitude,
          row.timestamp,
          row.speed_kmh,
          row.raw_speed_kmh,
          row.location_accuracy_m,
          row.altitude,
        ],
      );
    }
  });
}

export async function getRidePoints(rideId: string) {
  const database = getDatabase();
  if (!database) return [] as RidePoint[];
  const rows = await database.getAllAsync<RidePointRow>(
    `select ride_id, latitude, longitude, timestamp, speed_kmh, raw_speed_kmh, location_accuracy_m, altitude
     from ride_points
     where ride_id = ?
     order by timestamp asc`,
    [rideId],
  );
  return rows.map(fromRow);
}

export async function getRidePointCount(rideId: string) {
  const database = getDatabase();
  if (!database) return 0;
  const row = await database.getFirstAsync<{ count: number }>(
    'select count(*) as count from ride_points where ride_id = ?',
    [rideId],
  );
  return row?.count ?? 0;
}

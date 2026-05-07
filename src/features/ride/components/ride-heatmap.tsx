import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import type { RideRecord } from '@/types/domain';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColor(distance: number): string {
  if (distance <= 0) return '#1E1E1E';
  if (distance <= 10) return 'rgba(192,57,43,0.25)';
  if (distance <= 50) return 'rgba(192,57,43,0.50)';
  if (distance <= 100) return 'rgba(192,57,43,0.75)';
  return '#C0392B';
}

function buildDateGrid(rides: RideRecord[], numDays: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const distanceByDate = new Map<string, number>();
  for (const ride of rides) {
    const d = new Date(ride.started_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    distanceByDate.set(key, (distanceByDate.get(key) ?? 0) + ride.distance_km);
  }

  const dates: { date: Date; key: string; distance: number }[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dates.push({ date: d, key, distance: distanceByDate.get(key) ?? 0 });
  }

  return dates;
}

export function CustomCalendarHeatmap({ rides, numDays = 90 }: { rides: RideRecord[]; numDays?: number }) {
  const dates = useMemo(() => buildDateGrid(rides, numDays), [rides, numDays]);
  const cellSize = 8;
  const cellGap = 2;

  const totalWeeks = Math.ceil(dates.length / 7);
  const weeks = useMemo(() => {
    const result: { date: Date; key: string; distance: number }[][] = [];
    for (let w = 0; w < totalWeeks; w++) {
      result.push(dates.slice(w * 7, (w + 1) * 7));
    }
    return result;
  }, [dates, totalWeeks]);

  const monthPositions = useMemo(() => {
    const positions: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const firstDate = weeks[w][0]?.date;
      if (!firstDate) continue;
      const month = firstDate.getMonth();
      const day = firstDate.getDate();
      if (month !== lastMonth && day <= 7) {
        positions.push({ col: w, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    }
    return positions;
  }, [weeks]);

  const totalRides = rides.length;
  const totalDistance = rides.reduce((sum, r) => sum + r.distance_km, 0);

  return (
    <View style={{ paddingTop: 8, paddingBottom: 10, alignItems: 'center' }}>
      {/* Month labels row */}
      <View
        style={{
          flexDirection: 'row',
          width: 184,
          paddingLeft: 18,
          marginBottom: 4,
        }}>
        {Array.from({ length: totalWeeks }).map((_, col) => {
          const pos = monthPositions.find((p) => p.col === col);
          return (
            <View key={`mh-${col}`} style={{ width: cellSize + cellGap }}>
              {pos ? (
                <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 7 }}>
                  {pos.label}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Grid row: day labels + cells */}
      <View style={{ flexDirection: 'row', width: 184, justifyContent: 'center' }}>
        <View style={{ width: 12, justifyContent: 'space-between', paddingVertical: 1, marginRight: 6 }}>
          {DAY_LABELS.map((day, i) => (
            <AppText
              key={`${day}-${i}`}
              variant="meta"
              style={{
                color: palette.textTertiary,
                fontSize: 7,
                textAlign: 'center',
                lineHeight: 8,
              }}>
              {day}
            </AppText>
          ))}
        </View>

        <View style={{ width: 166 }}>
          <View style={{ gap: cellGap }}>
            {Array.from({ length: 7 }).map((_, row) => (
              <View key={`row-${row}`} style={{ flexDirection: 'row', gap: cellGap }}>
                {weeks.map((week, col) => {
                  const cell = week[row];
                  const isRidden = cell && cell.distance > 0;
                  return (
                    <View
                      key={cell?.key ?? `empty-${col}-${row}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 1.5,
                        backgroundColor: cell ? getColor(cell.distance) : '#1E1E1E',
                        borderWidth: isRidden ? 0 : 0.5,
                        borderColor: isRidden ? 'transparent' : 'rgba(255,255,255,0.04)',
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Summary */}
      <AppText
        variant="meta"
        style={{
          color: palette.textTertiary,
          fontSize: 10,
          textAlign: 'center',
          marginTop: 8,
        }}>
        {totalRides} ride{totalRides !== 1 ? 's' : ''} · {totalDistance.toFixed(0)} km · last {numDays} days
      </AppText>

      {/* Legend */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 4,
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: 10,
        }}>
        {[
          { label: '0', dist: 0 },
          { label: '≤10', dist: 5 },
          { label: '≤50', dist: 30 },
          { label: '≤100', dist: 75 },
          { label: '100+', dist: 150 },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 1.5, backgroundColor: getColor(item.dist) }} />
            <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 8 }}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import type { RideRecord } from '@/types/domain';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_LABEL_WIDTH = 12;
const DAY_LABEL_GAP = 6;
const CELL_GAP = 2;
const MIN_CELL_SIZE = 6;
const MAX_CELL_SIZE = 18;

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
  const [availableWidth, setAvailableWidth] = useState(0);

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

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - availableWidth) > 1) {
      setAvailableWidth(nextWidth);
    }
  };

  const gridContainerWidth = Math.max(0, availableWidth - DAY_LABEL_WIDTH - DAY_LABEL_GAP);
  const rawCellSize = totalWeeks > 0
    ? Math.floor((gridContainerWidth - (totalWeeks - 1) * CELL_GAP) / totalWeeks)
    : MIN_CELL_SIZE;
  const cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, rawCellSize));
  const gridWidth = totalWeeks * cellSize + Math.max(totalWeeks - 1, 0) * CELL_GAP;
  const monthCellWidth = cellSize + CELL_GAP;

  // Reserve height matching the eventual grid so we don't jump on first layout.
  const reservedGridHeight = cellSize * 7 + CELL_GAP * 6;

  const isReady = availableWidth > 0;

  return (
    <View style={{ paddingTop: 10, paddingBottom: 8 }} onLayout={handleLayout}>
      {/* Month labels row */}
      <View
        style={{
          flexDirection: 'row',
          width: gridWidth + DAY_LABEL_WIDTH + DAY_LABEL_GAP,
          paddingLeft: DAY_LABEL_WIDTH + DAY_LABEL_GAP,
          marginBottom: 6,
          opacity: isReady ? 1 : 0,
        }}>
        {Array.from({ length: totalWeeks }).map((_, col) => {
          const pos = monthPositions.find((p) => p.col === col);
          return (
            <View key={`mh-${col}`} style={{ width: monthCellWidth }}>
              {pos ? (
                <AppText
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  variant="meta"
                  style={{ color: palette.textTertiary, fontSize: 10, lineHeight: 11, width: monthCellWidth * 3.2 }}>
                  {pos.label}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Grid row: day labels + cells */}
      <View style={{ flexDirection: 'row', width: gridWidth + DAY_LABEL_WIDTH + DAY_LABEL_GAP }}>
        <View
          style={{
            width: DAY_LABEL_WIDTH,
            marginRight: DAY_LABEL_GAP,
            justifyContent: 'space-between',
            paddingVertical: 1,
            height: reservedGridHeight,
          }}>
          {DAY_LABELS.map((day, i) => (
            <AppText
              key={`${day}-${i}`}
              variant="meta"
              style={{ color: palette.textTertiary, fontSize: 9, textAlign: 'center', lineHeight: 11 }}>
              {day}
            </AppText>
          ))}
        </View>

        <View style={{ width: gridWidth, height: reservedGridHeight }}>
          {isReady ? (
            <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
              {weeks.map((week, col) => (
                <Animated.View
                  key={`column-${col}`}
                  entering={FadeIn.delay(col * 12).duration(200)}
                  style={{ width: cellSize, gap: CELL_GAP }}>
                  {Array.from({ length: 7 }).map((_, row) => {
                    const cell = week[row];
                    const isRidden = cell && cell.distance > 0;
                    return (
                      <View
                        key={cell?.key ?? `empty-${col}-${row}`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: 2.5,
                          backgroundColor: cell ? getColor(cell.distance) : '#1E1E1E',
                          borderWidth: isRidden ? 0 : 0.5,
                          borderColor: isRidden ? 'transparent' : 'rgba(255,255,255,0.04)',
                        }}
                      />
                    );
                  })}
                </Animated.View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

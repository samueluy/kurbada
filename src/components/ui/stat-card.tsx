import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppCard } from '@/components/ui/app-card';
import { AppText } from '@/components/ui/app-text';
import { Colors, palette, Typography } from '@/constants/theme';

export function StatCard({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const isEmpty = Number.isFinite(numericValue) ? numericValue <= 0 : false;
  const decimalPlaces = typeof value === 'string' && value.includes('.') ? value.split('.')[1]?.length ?? 0 : 0;
  const counter = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(() =>
    Number.isFinite(numericValue) ? numericValue.toFixed(decimalPlaces) : String(value),
  );

  useFocusEffect(
    useCallback(() => {
      if (!Number.isFinite(numericValue)) {
        setDisplayValue(String(value));
        return undefined;
      }

      setDisplayValue((0).toFixed(decimalPlaces));
      counter.setValue(0);
      const listenerId = counter.addListener(({ value: animatedValue }) => {
        setDisplayValue(animatedValue.toFixed(decimalPlaces));
      });

      const animation = Animated.timing(counter, {
        toValue: numericValue,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      });

      animation.start(({ finished }) => {
        if (finished) {
          setDisplayValue(numericValue.toFixed(decimalPlaces));
        }
      });

      return () => {
        animation.stop();
        counter.removeListener(listenerId);
      };
    }, [counter, decimalPlaces, numericValue, value]),
  );

  return (
    <AppCard style={{ flex: 1, gap: 8, padding: 14, borderRadius: 14 }}>
      <AppText variant="label">
        {label}
      </AppText>
      <View style={{ gap: 3 }}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          numberOfLines={1}
          style={{
            ...Typography.monoMD,
            color: isEmpty ? Colors.t3 : accent ? palette.danger : palette.text,
          }}>
          {Number.isFinite(numericValue) ? displayValue : value}
        </Text>
        {unit ? (
          <AppText variant="meta" style={{ color: palette.textTertiary }}>
            {unit}
          </AppText>
        ) : null}
      </View>
    </AppCard>
  );
}

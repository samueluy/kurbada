import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';

const SIZE = 296;
const CENTER = SIZE / 2;
const RADIUS = 98;

function polar(angle: number, distance = RADIUS) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTER + distance * Math.cos(radians),
    y: CENTER + distance * Math.sin(radians),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polar(startAngle);
  const end = polar(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function LeanAngleGauge({
  leanAngle,
  speed,
  calibrating = false,
}: {
  leanAngle: number;
  speed?: number;
  calibrating?: boolean;
}) {
  const lean = useSharedValue(calibrating ? 0 : leanAngle);
  const pulse = useSharedValue(calibrating ? 0.65 : 1);

  useEffect(() => {
    lean.value = withTiming(calibrating ? 0 : leanAngle, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [calibrating, lean, leanAngle]);

  useEffect(() => {
    if (calibrating) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.65, { duration: 900 }),
        ),
        -1,
        false,
      );
      return;
    }

    pulse.value = withTiming(1, { duration: 180 });
  }, [calibrating, pulse]);

  const horizonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(lean.value, [-60, 60], [-36, 36])}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  const value = calibrating ? 0 : Math.round(leanAngle);
  const danger = Math.abs(value) > 30;

  return (
    <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 380 }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <LinearGradient id="leanArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgba(198,69,55,0.65)" />
            <Stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
            <Stop offset="100%" stopColor="rgba(198,69,55,0.65)" />
          </LinearGradient>
        </Defs>

        <Circle cx={CENTER} cy={CENTER} r={116} fill="rgba(255,255,255,0.02)" />
        <Circle cx={CENTER} cy={CENTER} r={116} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

        <Path d={arcPath(205, 335)} stroke="rgba(255,255,255,0.06)" strokeWidth={8} fill="none" strokeLinecap="round" />
        <Path d={arcPath(205, 335)} stroke="url(#leanArc)" strokeWidth={8} fill="none" strokeLinecap="round" />

        {[-60, -40, -20, 0, 20, 40, 60].map((tick) => {
          const angle = 270 + tick;
          const outer = polar(angle, 112);
          const inner = polar(angle, tick % 20 === 0 ? 94 : 100);
          return <Line key={tick} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.2)" strokeWidth={tick === 0 ? 2 : 1.5} />;
        })}

        <SvgText x={54} y={232} fill="rgba(255,255,255,0.42)" fontSize={10}>
          L 60
        </SvgText>
        <SvgText x={CENTER - 8} y={42} fill="rgba(255,255,255,0.42)" fontSize={10}>
          0
        </SvgText>
        <SvgText x={226} y={232} fill="rgba(255,255,255,0.42)" fontSize={10}>
          R 60
        </SvgText>
      </Svg>

      <View
        style={{
          position: 'absolute',
          width: 196,
          height: 196,
          borderRadius: 98,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 240,
              height: 2,
              backgroundColor: 'rgba(255,255,255,0.8)',
              shadowColor: '#FFFFFF',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            },
            horizonStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 96,
              height: 96,
              borderRadius: radius.round,
              backgroundColor: 'rgba(217,255,63,0.08)',
            },
            pulseStyle,
          ]}
        />
        <View style={{ alignItems: 'center', gap: 6 }}>
          <AppText variant="heroMetric" style={{ fontSize: 68, color: danger ? palette.danger : palette.text }}>
            {value}deg
          </AppText>
          <AppText variant="meta">
            {speed !== undefined ? `${Math.round(speed)} km/h live` : 'lean telemetry live'}
          </AppText>
        </View>
      </View>
    </View>
  );
}

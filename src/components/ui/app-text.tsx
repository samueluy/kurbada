import { Text, type TextProps } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';

type Variant =
  | 'brand'
  | 'eyebrow'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'screenTitle'
  | 'sectionTitle'
  | 'heroMetric'
  | 'largeMetric'
  | 'cardMetric'
  | 'body'
  | 'meta'
  | 'button'
  | 'label'
  | 'caption'
  | 'display'
  | 'title'
  | 'bodyBold'
  | 'mono';

const variantStyles: Record<Variant, TextProps['style']> = {
  brand: { fontFamily: Fonts.brand, fontSize: 20, letterSpacing: 4, color: Typography.display.color },
  eyebrow: Typography.eyebrow,
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  screenTitle: Typography.display,
  sectionTitle: { ...Typography.h1, fontSize: 18, lineHeight: 22 },
  heroMetric: Typography.monoXL,
  largeMetric: Typography.monoLG,
  cardMetric: Typography.monoLG,
  body: Typography.body,
  meta: Typography.bodySmall,
  button: { fontFamily: 'DMSans_700Bold', fontSize: 15, lineHeight: 18, color: Typography.display.color },
  label: Typography.label,
  caption: Typography.eyebrow,
  display: Typography.display,
  title: Typography.h1,
  bodyBold: { ...Typography.body, fontFamily: 'DMSans_700Bold', color: Typography.display.color },
  mono: Typography.monoSM,
};

export function AppText({ style, children, variant = 'body', ...rest }: TextProps & { variant?: Variant }) {
  return (
    <Text {...rest} style={[variantStyles[variant], style]}>
      {children}
    </Text>
  );
}

import { Text, type TextProps } from 'react-native';

import { Fonts, palette, typography } from '@/constants/theme';

type Variant =
  | 'brand'
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
  brand: { fontFamily: typography.heading, fontSize: 34, letterSpacing: 2.8, color: palette.text },
  screenTitle: { fontFamily: typography.heading, fontSize: 34, color: palette.text, lineHeight: 38 },
  sectionTitle: { fontFamily: typography.heading, fontSize: 24, color: palette.text, lineHeight: 28 },
  heroMetric: { fontFamily: typography.mono, fontSize: 72, letterSpacing: -2, color: palette.text, lineHeight: 76 },
  largeMetric: { fontFamily: typography.mono, fontSize: 48, color: palette.text, lineHeight: 52 },
  cardMetric: { fontFamily: Fonts.mono, fontSize: 34, color: palette.text, lineHeight: 36 },
  body: { fontFamily: typography.body, fontSize: 17, color: palette.text, lineHeight: 24 },
  meta: { fontFamily: typography.body, fontSize: 14, color: palette.textSecondary, lineHeight: 20 },
  button: { fontFamily: typography.bodySemiBold, fontSize: 17, color: palette.text, lineHeight: 20 },
  label: {
    fontFamily: typography.bodySemiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: palette.textSecondary,
  },
  caption: { fontFamily: typography.bodySemiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4, color: palette.textSecondary },
  display: { fontFamily: typography.heading, fontSize: 34, letterSpacing: 2.4, color: palette.text },
  title: { fontFamily: typography.heading, fontSize: 24, color: palette.text },
  bodyBold: { fontFamily: typography.bodySemiBold, fontSize: 17, color: palette.text, lineHeight: 24 },
  mono: { fontFamily: typography.mono, fontSize: 16, color: palette.text },
};

export function AppText({ style, children, variant = 'body', ...rest }: TextProps & { variant?: Variant }) {
  return (
    <Text {...rest} style={[variantStyles[variant], style]}>
      {children}
    </Text>
  );
}

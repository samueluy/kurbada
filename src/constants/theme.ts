import '@/global.css';

export const Colors = {
  bg: '#0D0D0D',
  s1: '#161616',
  s2: '#1E1E1E',
  s3: '#272727',
  s4: '#303030',
  t1: '#FFFFFF',
  t2: '#A0A0A0',
  t3: '#555555',
  t4: '#333333',
  red: '#C0392B',
  redLight: '#E05444',
  redDim: 'rgba(192,57,43,0.15)',
  redBorder: 'rgba(192,57,43,0.30)',
  redGlow: 'rgba(192,57,43,0.45)',
  green: '#2ECC71',
  greenDim: 'rgba(46,204,113,0.15)',
  amber: '#F39C12',
  amberDim: 'rgba(243,156,18,0.15)',
  border: 'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.12)',
} as const;

export const Typography = {
  display: {
    fontFamily: 'DMSans_900Black',
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.8,
    color: Colors.t1,
  },
  h1: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: Colors.t1,
  },
  h2: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: Colors.t1,
  },
  h3: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.t1,
  },
  eyebrow: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: Colors.t3,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.t2,
  },
  bodySmall: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.t2,
  },
  monoXL: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1,
    color: Colors.t1,
  },
  monoLG: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: Colors.t1,
  },
  monoMD: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: Colors.t1,
  },
  monoSM: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 15,
    lineHeight: 18,
    color: Colors.t1,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: Colors.t3,
  },
} as const;

export const Radius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 100, round: 999 } as const;

export const CardStyle = {
  backgroundColor: Colors.s1,
  borderRadius: Radius.lg,
  borderWidth: 0.5,
  borderColor: Colors.border,
} as const;

export const Fonts = {
  display: 'DMSans_900Black',
  heading: 'DMSans_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_600SemiBold',
  bodySemiBold: 'DMSans_700Bold',
  mono: 'DMMono_500Medium',
  monoStrong: 'DMMono_500Medium',
  brand: 'BebasNeue_400Regular',
} as const;

export const Shadow = {
  card: {},
  floating: {},
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  section: 28,
  xxl: 32,
  xxxl: 40,
  jumbo: 56,
} as const;

export const layout = {
  screenPadding: 20,
  tabBarHeight: 60,
  maxContentWidth: 920,
} as const;

export const motion = {
  press: 120,
  fast: 140,
  base: 180,
  slow: 220,
} as const;

export const chartColors = [Colors.t1, Colors.t2, Colors.t3, Colors.t4];

export const palette = {
  background: Colors.bg,
  surface: Colors.s1,
  surfaceMuted: Colors.s2,
  surfaceStrong: Colors.s3,
  heroFrom: Colors.s2,
  heroTo: Colors.s1,
  text: Colors.t1,
  textSecondary: Colors.t2,
  textTertiary: Colors.t3,
  textInverse: Colors.t1,
  border: Colors.border,
  divider: Colors.border,
  dividerStrong: Colors.borderMid,
  danger: Colors.red,
  success: Colors.green,
  lime: Colors.redLight,
  weekend: Colors.s3,
  hustle: Colors.s2,
  blue: '#3498DB',
  lightBackground: Colors.bg,
  lightSurface: Colors.s1,
  lightSurfaceSoft: Colors.s2,
  lightText: Colors.t1,
  lightTextSecondary: Colors.t2,
} as const;

export const typography = {
  display: Fonts.display,
  heading: Fonts.heading,
  body: Fonts.body,
  bodyMedium: Fonts.bodyMedium,
  bodySemiBold: Fonts.bodySemiBold,
  mono: Fonts.mono,
} as const;

export const radius = {
  xs: Radius.xs,
  sm: Radius.sm,
  md: Radius.md,
  lg: Radius.lg,
  xl: Radius.xl,
  pill: Radius.pill,
  round: Radius.round,
} as const;

export const shadows = {
  card: Shadow.card,
  cardHeavy: Shadow.floating,
} as const;

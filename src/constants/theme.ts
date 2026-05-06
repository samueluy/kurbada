import '@/global.css';

export const LightColors = {
  bg: '#F4F4F1',
  elevated: '#FFFFFF',
  softSurface: '#ECECE7',
  textPrimary: '#171717',
  textSecondary: '#6F6F68',
  textMuted: '#9A9A92',
  hairline: 'rgba(255,255,255,0.18)',
  darkBorder: 'rgba(0,0,0,0.08)',
  action: '#171717',
} as const;

export const Colors = {
  bg: '#050505',
  surface: 'rgba(255,255,255,0.06)',
  surfaceSoft: 'rgba(255,255,255,0.04)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  textPrimary: '#F5F5F2',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.45)',
  inverse: '#FFFFFF',
  borderHairline: 'rgba(255,255,255,0.18)',
  borderSoft: 'rgba(255,255,255,0.08)',
  darkBorder: 'rgba(0,0,0,0.08)',
  accentDanger: '#C64537',
  accentSuccess: '#2F6B4F',
  accentLime: '#D9FF3F',
  glowWhite: 'rgba(255,255,255,0.18)',
  glowLime: 'rgba(217,255,63,0.12)',
  glowRed: 'rgba(198,69,55,0.18)',
  lightBg: LightColors.bg,
  lightSurface: LightColors.elevated,
  lightSoft: LightColors.softSurface,
  lightText: LightColors.textPrimary,
  dark: '#171717',
  mid: LightColors.textSecondary,
  faint: LightColors.softSurface,
  red: '#C64537',
  green: '#2F6B4F',
  border: 'rgba(255,255,255,0.18)',
  borderMid: 'rgba(255,255,255,0.08)',
  hudBg: '#050505',
  hudSurface: 'rgba(255,255,255,0.06)',
  hudBorder: 'rgba(255,255,255,0.08)',
  hudText: '#F5F5F2',
  hudMuted: 'rgba(255,255,255,0.45)',
} as const;

export const Fonts = {
  display: 'Inter_700Bold',
  heading: 'Inter_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  mono: 'Oswald_500Medium',
  monoStrong: 'Oswald_600SemiBold',
} as const;

export const Radius = {
  sm: 16,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 28,
  round: 999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 5,
  },
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
  tabBarHeight: 72,
  maxContentWidth: 920,
} as const;

export const motion = {
  press: 120,
  fast: 140,
  base: 180,
  slow: 220,
} as const;

export const chartColors = ['#F5F5F2', 'rgba(255,255,255,0.72)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.35)'];

export const palette = {
  background: Colors.bg,
  surface: Colors.surface,
  surfaceMuted: Colors.surfaceSoft,
  surfaceStrong: Colors.surfaceStrong,
  heroFrom: 'rgba(255,255,255,0.10)',
  heroTo: 'rgba(255,255,255,0.02)',
  text: Colors.textPrimary,
  textSecondary: Colors.textSecondary,
  textTertiary: Colors.textMuted,
  textInverse: Colors.inverse,
  border: Colors.borderSoft,
  divider: Colors.borderSoft,
  dividerStrong: Colors.borderHairline,
  danger: Colors.accentDanger,
  success: Colors.accentSuccess,
  lime: Colors.accentLime,
  weekend: Colors.surfaceStrong,
  hustle: Colors.surfaceSoft,
  blue: '#4D7CFE',
  lightBackground: LightColors.bg,
  lightSurface: LightColors.elevated,
  lightSurfaceSoft: LightColors.softSurface,
  lightText: LightColors.textPrimary,
  lightTextSecondary: LightColors.textSecondary,
} as const;

export const typography = {
  display: Fonts.display,
  heading: Fonts.heading,
  body: Fonts.body,
  bodyMedium: Fonts.bodyMedium,
  bodySemiBold: Fonts.bodySemiBold,
  mono: Fonts.monoStrong,
} as const;

export const radius = {
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

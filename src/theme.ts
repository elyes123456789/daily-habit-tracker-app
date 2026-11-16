/** Design tokens: the only place colours, type, spacing and radii are defined. */
import { Platform, type TextStyle } from 'react-native';

export const palettes = {
  light: {
    background: '#F5F1E8',
    surface: '#FCFAF5',
    surfaceAlt: '#ECE6D9',
    border: '#DAD2C2',
    text: '#23211C',
    textMuted: '#625C50',
    primary: '#3A6650',
    onPrimary: '#FFFFFF',
    primarySoft: '#D9E7DC',
    skip: '#9A5632',
    skipSoft: '#F2DFD2',
    missed: '#C9C1B0',
    danger: '#A1372C',
    scrim: 'rgba(35, 33, 28, 0.45)',
  },
  dark: {
    background: '#161512',
    surface: '#1F1D19',
    surfaceAlt: '#2B2924',
    border: '#3B3831',
    text: '#EFEADF',
    textMuted: '#ABA596',
    primary: '#92C4A3',
    onPrimary: '#10231A',
    primarySoft: '#25382D',
    skip: '#DD9A75',
    skipSoft: '#3B2B21',
    missed: '#545046',
    danger: '#EA8D81',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

/** Four steps for "share of habits done" in the all-habits heatmap. */
export const heatScale = {
  light: ["#C5DCCB", "#93BCA0", "#5F9275", "#3A6650"],
  dark: ["#2F4A3A", "#4A745A", "#6C9E80", "#92C4A3"],
} as const;

export type Scheme = keyof typeof palettes;
export type Palette = { [K in keyof typeof palettes.light]: string };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)' },
  default: { sans: 'normal', serif: 'serif' },
});

/** Serif for headings and numbers, sans for everything read at length. */
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, fontWeight: '600' },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  number: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, fontWeight: '600' },
  heading: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof type;

/** Smallest comfortable touch target (iOS 44pt / Android 48dp). */
export const TOUCH = 48;
export const WIDE_BREAKPOINT = 900;
export const XL_BREAKPOINT = 1280;
/** Room for the native tab bar below scrolling content. */
export const TAB_BAR_INSET = Platform.select({ ios: 60, android: 88, default: 0 });

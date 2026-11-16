import { useWindowDimensions } from 'react-native';

import { WIDE_BREAKPOINT, XL_BREAKPOINT } from '@/theme';

import { useHydrated } from './use-theme';

/** Responsive breakpoints. Before hydration the narrow layout is used. */
export function useLayout() {
  const { width } = useWindowDimensions();
  const w = useHydrated() ? width : 0;
  return { width: w, isWide: w >= WIDE_BREAKPOINT, isXL: w >= XL_BREAKPOINT };
}

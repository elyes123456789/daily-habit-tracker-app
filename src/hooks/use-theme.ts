import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import { useStore } from '@/data/store';
import { type Palette, type Scheme, palettes } from '@/theme';

/** False while rendering static HTML and hydrating it, true afterwards; keeps static HTML and hydration identical on web. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useTheme(): { colors: Palette; scheme: Scheme } {
  const system = useColorScheme();
  const hydrated = useHydrated();
  const preference = useStore().data.settings.theme;
  const scheme: Scheme =
    preference === 'system' ? (hydrated && system === 'dark' ? 'dark' : 'light') : preference;
  return { colors: palettes[scheme], scheme };
}

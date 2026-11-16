import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

import { NAV_ITEMS } from './nav-items';

/** The platform's own tab bar on iOS and Android. */
export function AppTabs() {
  const { colors } = useTheme();
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.primarySoft}
      tintColor={colors.primary}
      labelStyle={{ selected: { color: colors.text } }}>
      {NAV_ITEMS.map((item) => (
        <NativeTabs.Trigger key={item.name} name={item.name}>
          <NativeTabs.Trigger.Label>{item.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={item.sf} md={item.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

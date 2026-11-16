import { TabList, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { Pressable, type PressableProps, StyleSheet, View, type ViewProps } from 'react-native';

import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { space } from '@/theme';

import { NAV_ITEMS } from './nav-items';
import { Icon, type IconName, Txt } from './ui';

/** Web: a bottom tab bar on narrow screens. On wide screens the sidebar in `shell.web` navigates instead. */
export function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <TabBar>
          {NAV_ITEMS.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              <TabButton icon={item.icon} label={item.label} />
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

/**
 * `asChild` merges styles by object spread, which turns a style array into numeric keys and
 * crashes on web. So slot children set their own style and drop the merged one.
 */
function TabBar({ children }: ViewProps) {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
        isWide && { display: 'none' },
      ]}>
      {children}
    </View>
  );
}

function TabButton({ icon, label, isFocused, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...(props as PressableProps)}
      accessibilityRole="tab"
      accessibilityLabel={label}
      aria-selected={!!isFocused}
      style={styles.tab}>
      <View style={[styles.pill, isFocused && { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={20} color={isFocused ? colors.primary : colors.textMuted} />
      </View>
      <Txt variant="small" style={{ fontSize: 12, lineHeight: 16, fontWeight: '600' }} color={isFocused ? 'text' : 'textMuted'}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 'env(safe-area-inset-bottom)' as never },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 60, paddingVertical: space.sm },
  pill: { paddingHorizontal: space.lg, paddingVertical: 4, borderRadius: 999 },
});

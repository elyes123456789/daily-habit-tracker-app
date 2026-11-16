import { Link, usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, type PressableProps, StyleSheet, View } from 'react-native';

import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/theme';

import { NAV_ITEMS } from './nav-items';
import { Icon, type IconName, Txt } from './ui';

/** On wide screens, a persistent sidebar beside every screen. Narrow screens get the bottom tab bar instead. */
export function Shell({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const pathname = usePathname();

  if (!isWide || pathname === '/onboarding') return children;

  // Habit detail and form belong to the Habits section.
  const active = pathname.startsWith('/habit') ? '/habits' : pathname;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        accessibilityRole={'navigation' as never}
        accessibilityLabel="Main"
        style={[styles.sidebar, { borderRightColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: colors.primary }]}>
            <Icon name="check" size={18} color={colors.onPrimary} />
          </View>
          <Txt variant="title" style={{ fontSize: 19 }}>
            Daily Habits
          </Txt>
        </View>

        <View style={{ gap: space.xs }}>
          {NAV_ITEMS.map((item) => {
            const selected = active === item.href;
            return (
              <Link key={item.href} href={item.href} asChild>
                <NavLink icon={item.icon} label={item.label} selected={selected} />
              </Link>
            );
          })}
        </View>

        <Link href="/habit-form" asChild>
          <NavLink icon="plus" label="New habit" outlined />
        </Link>

        <View style={styles.footer}>
          <Icon name="lock" size={14} color={colors.textMuted} />
          <Txt variant="small" color="textMuted" style={{ flex: 1 }}>
            Stored only on this device
          </Txt>
        </View>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/**
 * Child of `<Link asChild>`. The slot merges styles by object spread, which breaks arrays and
 * style functions, so this sets its own style after spreading the link props.
 */
function NavLink({
  icon,
  label,
  selected,
  outlined,
  ...link
}: PressableProps & { icon: IconName; label: string; selected?: boolean; outlined?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...link}
      accessibilityRole="link"
      accessibilityLabel={label}
      {...(selected ? { 'aria-current': 'page' as const } : null)}
      style={(state) => [
        styles.item,
        outlined && { borderWidth: 1, borderColor: colors.border },
        // `hovered` exists on web only and is missing from the React Native types.
        (selected || (state as { hovered?: boolean }).hovered) && { backgroundColor: colors.surfaceAlt },
      ]}>
      <Icon name={icon} size={18} color={selected || outlined ? colors.primary : colors.textMuted} />
      <Txt variant="heading" style={{ fontSize: 15 }} color={selected || outlined ? 'text' : 'textMuted'}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 248, padding: space.xl, gap: space.xl, borderRightWidth: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  mark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  footer: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

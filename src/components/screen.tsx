import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { TAB_BAR_INSET, space } from '@/theme';

import { useFeedback } from './feedback';
import { Button, EmptyState, IconButton, Txt } from './ui';

type Props = {
  title: string;
  /** Small line above the title. */
  eyebrow?: string;
  /** Shows a back button that returns to `back` when there is no history (e.g. after a refresh). */
  back?: '/' | '/habits';
  actions?: ReactNode;
  /** Max content width on large screens. */
  maxWidth?: number;
  /** Leaves room for the native tab bar. */
  tab?: boolean;
  children: ReactNode;
};

/** Page frame: safe areas, scrolling, header, and the app-wide loading and storage-error states. */
export function Screen({ title, eyebrow, back, actions, maxWidth = 1120, tab, children }: Props) {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { confirm } = useFeedback();

  let body: ReactNode;
  if (store.status === 'loading') {
    body = (
      <View style={styles.center} accessibilityLabel="Loading your habits" accessibilityRole="progressbar">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (store.status === 'error') {
    body = (
      <EmptyState
        icon="alert-triangle"
        title="Your saved data could not be read"
        body={`Nothing has been changed or deleted. ${store.loadError ?? ''} You can try again, or start fresh on this device.`}
        action={
          <View style={styles.row}>
            <Button label="Try again" variant="primary" onPress={store.reload} />
            <Button
              label="Start fresh"
              variant="danger"
              onPress={async () => {
                const ok = await confirm({
                  title: 'Erase saved data?',
                  message:
                    'This permanently removes the unreadable data stored on this device. It cannot be undone.',
                  confirmLabel: 'Erase and start fresh',
                  destructive: true,
                });
                if (ok) await store.resetStorage();
              }}
            />
          </View>
        }
      />
    );
  } else {
    body = children;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: insets.top + (isWide ? space.xxxl : space.lg),
        paddingBottom: insets.bottom + space.xxxl + (tab ? TAB_BAR_INSET : 0),
        paddingLeft: insets.left + (isWide ? space.xxxl : space.lg),
        paddingRight: insets.right + (isWide ? space.xxxl : space.lg),
      }}>
      <View style={{ width: '100%', maxWidth, alignSelf: 'center', gap: space.xl }}>
        {store.saveError ? (
          <View
            accessibilityRole="alert"
            style={[styles.banner, { borderColor: colors.danger, backgroundColor: colors.surface }]}>
            <Txt variant="small" style={{ flex: 1 }}>
              {store.saveError}
            </Txt>
            <IconButton icon="x" label="Dismiss message" onPress={store.dismissSaveError} />
          </View>
        ) : null}
        <View style={styles.header}>
          {back ? (
            <IconButton
              icon="arrow-left"
              label="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace(back))}
            />
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            {eyebrow ? (
              <Txt variant="label" color="textMuted">
                {eyebrow}
              </Txt>
            ) : null}
            <Txt variant="display" accessibilityRole="header">
              {title}
            </Txt>
          </View>
          {store.status === 'ready' ? <View style={styles.row}>{actions}</View> : null}
        </View>
        {body}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 96, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: space.lg,
    gap: space.sm,
  },
});

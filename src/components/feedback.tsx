/**
 * Confirmation dialogs and transient messages.
 * `Alert.alert` does nothing on web, so both are drawn by the app itself.
 */
import { type PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/theme';

import { Button, Txt } from './ui';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface Feedback {
  /** Resolves `true` only if the user explicitly confirms. */
  confirm(options: ConfirmOptions): Promise<boolean>;
  notify(message: string, kind?: 'success' | 'error'): void;
}

const FeedbackContext = createContext<Feedback | null>(null);

export function FeedbackProvider({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    setDialog(options);
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);

  const notify = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    // Errors stay until dismissed; they may need reading twice.
    if (kind === 'success') timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setDialog(null);
  };

  const [value] = useState<Feedback>(() => ({ confirm, notify }));

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.toastWrap, { bottom: insets.bottom + 96 }]}>
          <Pressable
            accessibilityRole="alert"
            accessibilityLiveRegion={toast.kind === 'error' ? 'assertive' : 'polite'}
            accessibilityLabel={`${toast.message}. Dismiss`}
            onPress={() => setToast(null)}
            style={[
              styles.toast,
              { backgroundColor: colors.text, borderColor: toast.kind === 'error' ? colors.danger : colors.text },
            ]}>
            <Txt variant="small" style={{ color: colors.background, fontWeight: '600' }}>
              {toast.message}
            </Txt>
          </Pressable>
        </View>
      ) : null}
      <Modal
        visible={dialog !== null}
        transparent
        animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => close(false)}>
        <Pressable
          accessibilityLabel="Close dialog"
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
          onPress={() => close(false)}>
          {/* Stops taps inside the dialog from reaching the scrim. */}
          <Pressable
            accessibilityRole="alert"
            accessibilityViewIsModal
            onPress={() => {}}
            style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Txt variant="title" accessibilityRole="header">
              {dialog?.title}
            </Txt>
            <Txt color="textMuted">{dialog?.message}</Txt>
            <View style={styles.dialogActions}>
              <Button label={dialog?.cancelLabel ?? 'Cancel'} onPress={() => close(false)} />
              <Button
                label={dialog?.confirmLabel ?? 'OK'}
                variant={dialog?.destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): Feedback {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return value;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.xl,
    gap: space.md,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg },
  toast: {
    maxWidth: 520,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});

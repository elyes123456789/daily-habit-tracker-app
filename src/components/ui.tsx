/** Small themed primitives shared by every screen. */
import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { type Palette, type TextVariant, TOUCH, radius, space, type } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function iconName(name: string): IconName {
  return name in Feather.glyphMap ? (name as IconName) : 'check-circle';
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.text} />;
}

type TxtProps = TextProps & { variant?: TextVariant; color?: keyof Palette };

export function Txt({ variant = 'body', color = 'text', style, ...rest }: TxtProps) {
  const { colors } = useTheme();
  return <Text style={[type[variant], { color: colors[color] }, style]} {...rest} />;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  /** Read by screen readers when the visible label is not enough. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const fg =
    variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variant === 'primary' ? colors.primary : 'transparent',
          borderColor:
            variant === 'ghost' || variant === 'primary'
              ? 'transparent'
              : variant === 'danger'
                ? colors.danger
                : colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[type.heading, { color: fg, fontSize: 15 }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  color,
}: {
  icon: IconName;
  /** Required: icon-only buttons need a spoken name. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            aria-checked={selected}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text
              style={[
                type.small,
                { color: selected ? colors.text : colors.textMuted, fontWeight: '600' },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Txt variant="label" color="textMuted">
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...input}
        style={[
          type.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
          input.multiline && { minHeight: 88, textAlignVertical: 'top' },
        ]}
      />
      {error ? (
        <Txt variant="small" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" color="textMuted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** A titled block separated by a hairline rather than boxed in a card. */
export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ gap: space.md }, style]}>
      {title ? (
        <View style={[styles.sectionHead, { borderBottomColor: colors.border }]}>
          <Txt variant="label" color="textMuted" accessibilityRole="header">
            {title}
          </Txt>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Panel({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      {...rest}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={26} color={colors.primary} />
      </View>
      <Txt variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt color="textMuted" style={{ textAlign: 'center', maxWidth: 420 }}>
        {body}
      </Txt>
      {action}
    </View>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
      <Txt variant="label" color="textMuted">
        {label}
      </Txt>
      <Txt variant="number">{value}</Txt>
      {note ? (
        <Txt variant="small" color="textMuted">
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  iconButton: {
    minWidth: TOUCH,
    minHeight: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 3, alignSelf: 'flex-start' },
  segment: {
    minHeight: TOUCH - 8,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md - 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    minHeight: TOUCH,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panel: { borderWidth: 1, borderRadius: radius.lg, padding: space.xl, gap: space.lg },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  stat: { gap: 2, minWidth: 120 },
});

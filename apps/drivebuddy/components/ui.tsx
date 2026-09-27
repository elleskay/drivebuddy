import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IconName } from "@/lib/icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import {
  font,
  radius,
  space,
  type,
  withAlpha,
  type Category,
  type Theme,
  type TypeVariant,
} from "@/lib/theme";

// DriveBuddy UI kit. Every screen composes these primitives so spacing, type and
// color come from the tokens in lib/theme.ts and follow light/dark mode.

export type { IconName };

// On web a long single word (e.g. "Recommendations") does not wrap by default
// and overflows its row. break-word lets it wrap. Ignored on native.
export const webBreak =
  Platform.OS === "web" ? ({ wordBreak: "break-word" } as unknown as TextStyle) : null;

// react-native-web draws the browser focus outline around inputs; the field
// wrapper already shows a focus ring.
const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

/* ------------------------------------------------------------------ Text */

export type Tone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "accent"
  | "danger"
  | "success"
  | "warning"
  | "onAccent";

function toneColor(t: Theme, tone: Tone): string {
  const c = t.color;
  switch (tone) {
    case "secondary":
      return c.textSecondary;
    case "tertiary":
      return c.textTertiary;
    case "accent":
      return c.accentInk;
    case "danger":
      return c.danger;
    case "success":
      return c.success;
    case "warning":
      return c.warning;
    case "onAccent":
      return c.onAccent;
    default:
      return c.text;
  }
}

export function Text({
  variant = "body",
  tone = "primary",
  align,
  tabular,
  style,
  ...rest
}: RNTextProps & {
  variant?: TypeVariant;
  tone?: Tone;
  align?: TextStyle["textAlign"];
  /** Fixed-width digits so live numbers do not jitter as they change. */
  tabular?: boolean;
}) {
  const t = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: toneColor(t, tone) },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
}

/* ---------------------------------------------------------------- Layout */

export function Screen({
  children,
  edges = ["bottom"],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

/** Large in-content title used at the top of every screen. */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerText}>
        {eyebrow ? (
          <Text variant="overline" tone="tertiary">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title1" accessibilityRole="header" style={webBreak}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  style,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.section, style]}>
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={10}
          accessibilityRole="button"
          style={styles.sectionAction}
        >
          <Text variant="subheadStrong" tone="secondary">
            {action.label}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={t.color.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Small uppercase label above a list group. */
export function GroupLabel({ children }: { children: string }) {
  const styles = useStyles();
  return (
    <Text variant="overline" tone="tertiary" style={styles.groupLabel}>
      {children}
    </Text>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.divider, style]} />;
}

/* ----------------------------------------------------------- Surfaces */

export function Card({
  children,
  onPress,
  variant = "default",
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: "default" | "muted" | "accent";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const base = [
    styles.card,
    variant === "muted" && styles.cardMuted,
    variant === "accent" && styles.cardAccent,
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function Banner({
  tone = "warning",
  icon,
  title,
  message,
  style,
}: {
  tone?: "warning" | "danger" | "info" | "success";
  icon: IconName;
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const styles = useStyles();
  const fg = t.color[tone];
  const bg = t.color[`${tone}Soft` as const];
  return (
    <View style={[styles.banner, { backgroundColor: bg }, style]} accessibilityRole="alert">
      <Ionicons name={icon} size={20} color={fg} style={styles.bannerIcon} />
      <View style={styles.flex}>
        {title ? (
          <Text variant="subheadStrong" style={{ color: fg }}>
            {title}
          </Text>
        ) : null}
        <Text variant="subhead">{message}</Text>
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  style,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={t.color.textSecondary} />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="subhead" tone="secondary" align="center" style={styles.emptyMessage}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          size="md"
          style={styles.emptyAction}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------ Actions */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerSoft";
type ButtonSize = "lg" | "md" | "sm";

const BUTTON_HEIGHT: Record<ButtonSize, number> = { lg: 54, md: 46, sm: 36 };

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const c = t.color;
  const bg = {
    primary: c.accent,
    secondary: c.surfaceMuted,
    ghost: "transparent",
    danger: c.dangerSolid,
    dangerSoft: c.dangerSoft,
  }[variant];
  const fg = {
    primary: c.onAccent,
    secondary: c.text,
    ghost: c.text,
    danger: c.onDanger,
    dangerSoft: c.danger,
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.btn,
        {
          height: BUTTON_HEIGHT[size],
          backgroundColor: bg,
          paddingHorizontal: size === "sm" ? space.md : space.xl,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === "sm" ? 16 : 19} color={fg} /> : null}
          <Text variant={size === "sm" ? "subheadStrong" : "bodyStrong"} style={{ color: fg }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type IconButtonVariant = "surface" | "muted" | "plain" | "accent" | "danger";

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = "surface",
  size = 44,
  color,
  badge,
  disabled,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: number;
  color?: string;
  badge?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const styles = useStyles();
  const c = t.color;
  const bg = {
    surface: c.surface,
    muted: c.surfaceMuted,
    plain: "transparent",
    accent: c.accent,
    danger: c.dangerSolid,
  }[variant];
  const fg =
    color ??
    { surface: c.text, muted: c.text, plain: c.text, accent: c.onAccent, danger: c.onDanger }[
      variant
    ];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        variant === "surface" && styles.iconBtnBorder,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={fg} />
      {badge ? <CountBadge count={badge} style={styles.iconBtnBadge} /> : null}
    </Pressable>
  );
}

/* ------------------------------------------------------ Small elements */

export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <View style={[styles.countBadge, style]}>
      <Text variant="caption" style={styles.countBadgeText}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

type PillTone = "neutral" | "accent" | "solid" | "danger" | "success" | "warning" | "info";

export function Pill({
  label,
  tone = "neutral",
  icon,
  style,
}: {
  label: string;
  tone?: PillTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const styles = useStyles();
  const c = t.color;
  const [bg, fg] = {
    neutral: [c.surfaceMuted, c.textSecondary],
    accent: [c.accentSoft, c.accentInk],
    solid: [c.accent, c.onAccent],
    danger: [c.dangerSoft, c.danger],
    success: [c.successSoft, c.success],
    warning: [c.warningSoft, c.warning],
    info: [c.infoSoft, c.info],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

/** Rounded square with a tinted background and a category-colored glyph. */
export function IconWell({
  icon,
  category = "neutral",
  color,
  size = 40,
  style,
}: {
  icon: IconName;
  category?: Category;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const styles = useStyles();
  const c = color ?? t.category[category];
  return (
    <View
      style={[
        styles.well,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          backgroundColor: withAlpha(c, t.scheme === "dark" ? 0.16 : 0.1),
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={c} />
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name?: string | null; size?: number }) {
  const t = useTheme();
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.color.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <RNText
        style={{
          fontFamily: font.bold,
          fontSize: Math.round(size * 0.42),
          lineHeight: Math.round(size * 0.52),
          color: t.color.onAccent,
        }}
      >
        {initial}
      </RNText>
    </View>
  );
}

/** Metric tile: big tabular value, optional unit, caption label. */
export function Stat({
  label,
  value,
  unit,
  icon,
  category,
  style,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: IconName;
  category?: Category;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.stat, style]}>
      {icon ? <IconWell icon={icon} category={category} size={32} style={styles.statIcon} /> : null}
      <View style={styles.statValueRow}>
        <Text variant="title2" tabular numberOfLines={1}>
          {value}
        </Text>
        {unit ? (
          <Text variant="footnote" tone="secondary" style={styles.statUnit}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="footnote" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------------- Lists */

/** Inset grouped list with hairline separators between rows. */
export function ListGroup({
  children,
  inset = space.lg,
  style,
}: {
  children: ReactNode;
  /** Left inset of the separators (align them with the row text). */
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, i) => (
        <View key={row.key ?? i}>
          {i > 0 ? <View style={[styles.separator, { marginLeft: inset }]} /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  icon,
  category,
  value,
  right,
  onPress,
  chevron,
  destructive,
  disabled,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  category?: Category;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles();
  const showChevron = chevron ?? (!!onPress && !right);
  const content = (
    <>
      {icon ? <IconWell icon={icon} category={category} size={34} /> : null}
      <View style={styles.rowBody}>
        <Text variant="callout" tone={destructive ? "danger" : "primary"} style={webBreak}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="subhead" tone="secondary" numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}
      {right}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={17} color={t.color.textTertiary} />
      ) : null}
    </>
  );
  if (!onPress) return <View style={[styles.row, disabled && styles.disabled]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

/* ---------------------------------------------------------------- Forms */

export function TextField({
  label,
  icon,
  error,
  secure = false,
  multiline,
  style,
  onFocus,
  onBlur,
  ...input
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string | null;
  /** Password field with a show/hide toggle. */
  secure?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="subheadStrong" tone="secondary">
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMulti,
          focused && { borderColor: t.color.focus },
          !!error && { borderColor: t.color.danger },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? t.color.text : t.color.textTertiary}
            style={multiline ? styles.inputIconTop : null}
          />
        ) : null}
        <TextInput
          {...input}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={t.color.textTertiary}
          selectionColor={t.color.accentInk}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMulti, webNoOutline, style]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={19}
              color={t.color.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.segment, style]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.segmentItem, on && styles.segmentItemOn]}
          >
            <Text variant="subheadStrong" tone={on ? "primary" : "secondary"} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Switch with the same look on iOS, Android and web. */
export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(x, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 5,
    }).start();
  }, [value, x]);

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.toggle,
        { backgroundColor: value ? t.color.accent : t.color.surfaceStrong },
        disabled && styles.disabled,
      ]}
    >
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: value ? t.color.onAccent : "#FFFFFF",
            transform: [
              { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

/* --------------------------------------------------------------- Styles */

const useStyles = makeStyles((t) => {
  const c = t.color;
  const dark = t.scheme === "dark";
  return {
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: c.bg },
    pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
    disabled: { opacity: 0.45 },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: space.md,
      paddingTop: space.sm,
    },
    headerText: { flex: 1, minWidth: 0, gap: space.xxs },
    headerRight: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: 2 },
    section: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: space.sm,
    },
    sectionAction: { flexDirection: "row", alignItems: "center", gap: 2 },
    groupLabel: { marginTop: space.lg, marginBottom: space.sm, marginLeft: space.xs },
    divider: { height: 1, backgroundColor: c.border },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: space.lg,
    },
    cardMuted: { backgroundColor: c.surfaceMuted, borderColor: "transparent" },
    cardAccent: { backgroundColor: c.accent, borderColor: "transparent" },

    banner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: space.md,
      borderRadius: radius.md,
      padding: space.lg,
    },
    bannerIcon: { marginTop: 1 },

    empty: {
      alignItems: "center",
      gap: space.sm,
      paddingVertical: space.xxxl,
      paddingHorizontal: space.xl,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: space.sm,
    },
    emptyMessage: { maxWidth: 300 },
    emptyAction: { marginTop: space.md, alignSelf: "center" },

    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space.sm,
      borderRadius: radius.pill,
    },
    iconBtn: { alignItems: "center", justifyContent: "center" },
    iconBtnBorder: { borderWidth: 1, borderColor: c.border },
    iconBtnBadge: { position: "absolute", top: -3, right: -3 },

    countBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: c.dangerSolid,
      borderWidth: 2,
      borderColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeText: { color: c.onDanger, fontSize: 10, lineHeight: 12, fontFamily: font.bold },

    pill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: space.xs,
      borderRadius: radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    well: { alignItems: "center", justifyContent: "center" },

    stat: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: space.lg,
      gap: 2,
    },
    statIcon: { marginBottom: space.sm },
    statValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    statUnit: { marginLeft: 1 },

    group: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    separator: { height: 1, backgroundColor: c.border },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      minHeight: 56,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
    },
    rowPressed: { backgroundColor: c.surfaceMuted },
    rowBody: { flex: 1, minWidth: 0, gap: 1 },
    rowValue: { maxWidth: "55%" },

    field: { gap: space.sm },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      minHeight: 54,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: dark ? c.border : c.borderStrong,
      backgroundColor: dark ? c.surfaceMuted : c.surface,
      paddingHorizontal: space.lg,
    },
    inputWrapMulti: { alignItems: "flex-start", paddingVertical: space.md },
    inputIconTop: { marginTop: 2 },
    input: {
      flex: 1,
      minWidth: 0,
      alignSelf: "stretch",
      color: c.text,
      fontFamily: font.regular,
      fontSize: 16,
      paddingVertical: 0,
    },
    inputMulti: { minHeight: 76, textAlignVertical: "top" },

    segment: {
      flexDirection: "row",
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.pill,
      padding: 3,
    },
    segmentItem: {
      flex: 1,
      height: 36,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: space.sm,
    },
    segmentItemOn: dark
      ? { backgroundColor: c.surfaceStrong }
      : {
          backgroundColor: c.surface,
          shadowColor: "#0B0C0E",
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },

    toggle: { width: 52, height: 32, borderRadius: 16, padding: 3 },
    knob: {
      width: 26,
      height: 26,
      borderRadius: 13,
      shadowColor: "#000000",
      shadowOpacity: 0.18,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
  };
});

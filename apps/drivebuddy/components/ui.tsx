import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radius, spacing, TOUCH_TARGET } from "@/lib/theme";

// Small, token-driven primitive set (variant API in the shadcn / react-native-
// reusables spirit) so screens compose consistent UI without a heavy library or
// NativeWind. Pure StyleSheet - no new deps, no native rebuild.

type CardVariant = "default" | "primary";
export function Card({
  children,
  variant = "default",
  style,
}: {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, variant === "primary" && styles.cardPrimary, style]}>{children}</View>;
}

type ButtonVariant = "primary" | "ghost" | "danger";
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isGhost = variant === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "danger" && styles.btnDanger,
        isGhost && styles.btnGhost,
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.primary : "#fff"} />
      ) : (
        <Text style={[styles.btnText, isGhost && { color: colors.primary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Badge({ value }: { value: number | string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{value}</Text>
    </View>
  );
}

/** Glanceable navigation tile (home grid). Min height meets the touch-target guide. */
export function NavCard({
  title,
  desc,
  onPress,
  primary = false,
  badge,
  style,
}: {
  title: string;
  desc: string;
  onPress: () => void;
  primary?: boolean;
  badge?: number;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.nav, primary && styles.navPrimary, style]}>
      <View style={styles.navRow}>
        <Text style={styles.navTitle}>{title}</Text>
        {badge != null && badge > 0 ? <Badge value={badge > 99 ? "99+" : badge} /> : null}
      </View>
      <Text style={styles.navDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardPrimary: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  btn: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  nav: {
    minHeight: 92,
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  navPrimary: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  navTitle: { color: colors.text, fontSize: 16, fontWeight: "700", flexShrink: 1 },
  navDesc: { color: colors.textMuted, fontSize: 12 },
});

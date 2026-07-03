import { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, gradients, radius, shadow, spacing, TOUCH_TARGET } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// On web, a long single word (e.g. "Recommendations") will not wrap by default
// and overflows its card. break-word lets it wrap. No-op / ignored on native.
const webBreak =
  Platform.OS === "web" ? ({ wordBreak: "break-word" } as unknown as TextStyle) : null;

export function Card({
  children,
  variant = "default",
  style,
}: {
  children: React.ReactNode;
  variant?: "default" | "primary";
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, variant === "primary" && styles.cardPrimary, style]}>
      {children}
    </View>
  );
}

/** Gradient hero banner (greeting / section headline). */
export function Hero({
  title,
  subtitle,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <LinearGradient
      colors={gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
      {children}
    </LinearGradient>
  );
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
  const inner = loading ? (
    <ActivityIndicator color={isGhost ? colors.primary : "#fff"} />
  ) : (
    <Text style={[styles.btnText, isGhost && { color: colors.primary }]}>{label}</Text>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btnWrap, (disabled || loading) && { opacity: 0.6 }, style]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btn,
            variant === "danger" && { backgroundColor: colors.danger },
            isGhost && styles.btnGhost,
          ]}
        >
          {inner}
        </View>
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

/** Glanceable nav tile with a coloured icon badge, chevron, and press animation. */
export function NavCard({
  title,
  desc,
  icon,
  tint = colors.primary,
  onPress,
  primary = false,
  badge,
  style,
}: {
  title: string;
  desc: string;
  icon: IoniconName;
  tint?: string;
  onPress: () => void;
  primary?: boolean;
  badge?: number;
  style?: ViewStyle;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  const content = (
    <>
      <View
        style={[styles.iconWrap, primary ? styles.iconWrapGrad : { backgroundColor: tint + "1a" }]}
      >
        <Ionicons name={icon} size={22} color={primary ? "#fff" : tint} />
      </View>
      <View style={styles.navBody}>
        <View style={styles.navRow}>
          <Text style={[styles.navTitle, webBreak, primary && { color: "#fff" }]} numberOfLines={2}>
            {title}
          </Text>
          {badge != null && badge > 0 ? <Badge value={badge > 99 ? "99+" : badge} /> : null}
        </View>
        <Text
          style={[styles.navDesc, webBreak, primary && { color: "rgba(255,255,255,0.9)" }]}
          numberOfLines={2}
        >
          {desc}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={primary ? "rgba(255,255,255,0.85)" : colors.textDim}
      />
    </>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable onPress={onPress} onPressIn={() => to(0.97)} onPressOut={() => to(1)}>
        {primary ? (
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.navBase, shadow]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={[styles.navBase, styles.navCard]}>{content}</View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow,
  },
  cardPrimary: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  hero: {
    borderRadius: 20,
    padding: spacing.xl,
    gap: 4,
    ...shadow,
    shadowOpacity: 0.18,
    shadowColor: "#4338ca",
  },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2 },
  btnWrap: { borderRadius: radius.lg, overflow: "hidden" },
  btn: {
    minHeight: TOUCH_TARGET,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
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
  navBase: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  navCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    ...shadow,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapGrad: { backgroundColor: "rgba(255,255,255,0.22)" },
  // minWidth:0 lets the text column shrink so long titles wrap instead of
  // overflowing the card (a no-op on native, required on web flexbox).
  navBody: { flex: 1, minWidth: 0 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  navTitle: { color: colors.text, fontSize: 16, fontWeight: "700", flex: 1, minWidth: 0 },
  navDesc: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
});

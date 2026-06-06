import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

// Zero-dependency skeleton loaders (RN's built-in Animated only - no Reanimated,
// no linear-gradient, no native rebuild). A gentle opacity pulse stands in for a
// shimmer while data loads, which reads far better than a blank spinner.

export function Skeleton({
  width = "100%",
  height = 16,
  radius: r = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: r, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
}

/** A card-shaped placeholder: a title line + two body lines. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width="55%" height={18} />
      <Skeleton width="85%" height={12} style={{ marginTop: spacing.sm }} />
      <Skeleton width="45%" height={12} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

/** A list of card placeholders for list/dashboard screens. */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});

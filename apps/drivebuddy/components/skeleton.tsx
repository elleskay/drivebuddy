import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/lib/theme";

// Zero-dependency skeleton loaders with a real sweeping sheen (RN Animated only -
// no Reanimated, no linear-gradient). A light highlight bar translates across a
// muted base, which reads far better than a flat opacity pulse.

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
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1200, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: r, backgroundColor: colors.skeleton, overflow: "hidden" }, style]}
    >
      {w > 0 ? (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: w * 0.5,
            backgroundColor: colors.skeletonHighlight,
            opacity: 0.85,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.6, w * 1.1] }) }],
          }}
        />
      ) : null}
    </View>
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
    ...shadow,
  },
});

import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadow, spacing } from "@/lib/theme";

// Skeleton loaders with a real diagonal gradient shimmer sweeping across a muted
// base (expo-linear-gradient + RN Animated). Reads as a premium loading state.

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
      Animated.timing(x, { toValue: 1, duration: 1300, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: r, backgroundColor: colors.skeleton, overflow: "hidden" },
        style,
      ]}
    >
      {w > 0 ? (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            transform: [
              { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-w, w] }) },
            ],
          }}
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.95)", "transparent"]}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A card-shaped placeholder: a title line + two body lines. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <Skeleton width={40} height={40} radius={radius.round} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="55%" height={16} />
          <Skeleton width="80%" height={12} />
        </View>
      </View>
      <Skeleton width="45%" height={12} style={{ marginTop: spacing.md }} />
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
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});

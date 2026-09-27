import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";

// Skeleton loaders: a soft gradient sheen sweeping across a muted base
// (expo-linear-gradient + RN Animated), tinted for light or dark mode.

export function Skeleton({
  width = "100%",
  height = 16,
  radius: r = radius.xs,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
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
        { width, height, borderRadius: r, backgroundColor: t.color.skeleton, overflow: "hidden" },
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
            colors={["transparent", t.color.shimmer, "transparent"]}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A card-shaped placeholder: an icon, a title line and a body line. */
export function SkeletonCard() {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Skeleton width={40} height={40} radius={13} />
      <View style={styles.lines}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="85%" height={11} />
      </View>
    </View>
  );
}

/** A list of card placeholders for list/dashboard screens. */
export function SkeletonList({ count = 5 }: { count?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.list}>
      <Skeleton width="45%" height={30} radius={10} style={styles.title} />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { flex: 1, backgroundColor: t.color.bg, padding: space.xl, gap: space.md },
  title: { marginTop: space.sm, marginBottom: space.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: t.color.surface,
    borderColor: t.color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  lines: { flex: 1, gap: space.sm },
}));

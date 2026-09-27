import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { radius, space, withAlpha } from "@/lib/theme";
import { RouteArt } from "@/components/route-art";
import { Text } from "@/components/ui";

/** Lime brand panel at the top of the sign-in and sign-up screens. */
export function AuthHero({ title }: { title: string }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <RouteArt
        road={withAlpha(t.color.onAccent, 0.07)}
        lane={withAlpha(t.color.onAccent, 0.22)}
        dot={t.color.onAccent}
      />
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="car-sport" size={18} color={t.color.accent} />
        </View>
        <Text variant="bodyStrong" tone="onAccent">
          DriveBuddy
        </Text>
      </View>
      <Text variant="display" tone="onAccent" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  hero: {
    backgroundColor: t.color.accent,
    borderRadius: radius.xl,
    padding: space.xxl,
    minHeight: 236,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: t.color.onAccent,
    alignItems: "center",
    justifyContent: "center",
  },
}));

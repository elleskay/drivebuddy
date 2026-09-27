import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Tabs } from "expo-router";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { font, space } from "@/lib/theme";
import { Text } from "@/components/ui";

// BottomTabBarProps without importing @react-navigation/bottom-tabs directly
// (it is expo-router's dependency, not ours).
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** The tab route rendered as the raised primary action in the middle of the bar. */
const PRIMARY_TAB = "journey";

/**
 * Floating pill tab bar. Each tab's icon comes from its `tabBarIcon` option;
 * the Drive tab renders as a lime action button in the center.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useAndroidKeyboardOpen();

  // Android resizes the window for the keyboard; hide the bar so the
  // assistant's composer keeps the space.
  if (keyboardOpen) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom - 4, space.md) }]}>
      <View style={[styles.bar, t.float]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate({ name: route.name, params: route.params, merge: true });
            }
          };
          const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

          if (route.name === PRIMARY_TAB) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: focused }}
                style={styles.item}
              >
                <View style={[styles.driveRing, focused && styles.driveRingOn]}>
                  <View style={styles.drive}>
                    {options.tabBarIcon?.({ focused, color: t.color.onAccent, size: 24 })}
                  </View>
                </View>
              </Pressable>
            );
          }

          const color = focused ? t.color.text : t.color.textTertiary;
          const iconColor = focused && t.scheme === "dark" ? t.color.accent : color;
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              style={styles.item}
            >
              <View style={[styles.iconPill, focused && styles.iconPillOn]}>
                {options.tabBarIcon?.({ focused, color: iconColor, size: 21 })}
              </View>
              <Text
                variant="caption"
                numberOfLines={1}
                style={[styles.label, { color }, focused && styles.labelOn]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function useAndroidKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

const useStyles = makeStyles((t) => ({
  wrap: {
    backgroundColor: t.color.bg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: 70,
    borderRadius: 35,
    backgroundColor: t.color.tabBar,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingHorizontal: space.xs,
  },
  item: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 3 },
  iconPill: {
    width: 50,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillOn: { backgroundColor: t.color.accentSoft },
  label: { fontSize: 11, lineHeight: 13 },
  labelOn: { fontFamily: font.semibold },
  driveRing: {
    padding: 3,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: "transparent",
  },
  driveRingOn: { borderColor: t.color.accent },
  drive: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: t.color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
}));

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TabBar } from "@/components/tab-bar";
import type { IconName } from "@/components/ui";
import { useTheme } from "@/lib/theme-context";

// Outline icon when idle, filled when focused (the tab bar passes `focused`).
const icon =
  (outline: IconName, filled: IconName) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? filled : outline} color={color} size={size} />
  );

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      // Tab screens draw their own large titles, so the navigator header is off.
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: t.color.bg }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "DriveBuddy",
          tabBarLabel: "Home",
          tabBarIcon: icon("home-outline", "home"),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Live", tabBarIcon: icon("pulse-outline", "pulse") }}
      />
      <Tabs.Screen
        name="journey"
        options={{ title: "Drive", tabBarIcon: icon("car-sport-outline", "car-sport") }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: "Assistant", tabBarIcon: icon("sparkles-outline", "sparkles") }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "History", tabBarIcon: icon("time-outline", "time") }}
      />
    </Tabs>
  );
}

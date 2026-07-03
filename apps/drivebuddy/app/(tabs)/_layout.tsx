import { Tabs, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
const icon =
  (name: IoniconName) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitle: "DriveBuddy",
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "DriveBuddy",
          tabBarLabel: "Home",
          tabBarIcon: icon("home-outline"),
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
              <Text
                style={{ color: colors.primary, fontSize: 14, fontWeight: "600", marginRight: 14 }}
              >
                Settings
              </Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="journey" options={{ title: "Drive", tabBarIcon: icon("car-outline") }} />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Live Info",
          tabBarLabel: "Live",
          tabBarIcon: icon("speedometer-outline"),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: "Assistant", tabBarIcon: icon("chatbubble-ellipses-outline") }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "History", tabBarIcon: icon("time-outline") }}
      />
    </Tabs>
  );
}

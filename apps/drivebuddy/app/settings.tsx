import Constants from "expo-constants";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { makeStyles, useAppearance, useTheme, type Appearance } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import {
  Avatar,
  Button,
  Card,
  GroupLabel,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
} from "@/components/ui";

const APPEARANCE_OPTIONS: { label: string; value: Appearance }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

// Separator inset: row padding (16) + icon well (34) + gap (12).
const ROW_INSET = 62;

export default function SettingsScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
  const { user, signOut } = useAuth();
  const { appearance, setAppearance } = useAppearance();
  const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "-";
  const version = Constants.expoConfig?.version ?? "0.1.0";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" />

        <Card
          onPress={() => router.push("/profile")}
          accessibilityLabel="Edit profile"
          style={styles.profile}
        >
          <Avatar name={user?.fullName} size={56} />
          <View style={styles.flex}>
            <Text variant="title3" numberOfLines={1}>
              {user?.fullName ?? "DriveBuddy user"}
            </Text>
            <Text variant="subhead" tone="secondary" numberOfLines={1}>
              {user?.email ?? ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.color.textTertiary} />
        </Card>

        <GroupLabel>Appearance</GroupLabel>
        <Segmented options={APPEARANCE_OPTIONS} value={appearance} onChange={setAppearance} />

        <GroupLabel>Account</GroupLabel>
        <ListGroup inset={ROW_INSET}>
          <ListRow
            title="Edit profile"
            icon="person-outline"
            category="weather"
            onPress={() => router.push("/profile")}
          />
          <ListRow
            title="My vehicles"
            icon="car-outline"
            category="fuel"
            onPress={() => router.push("/vehicles")}
          />
          <ListRow
            title="Notification settings"
            icon="notifications-outline"
            category="traffic"
            onPress={() => router.push("/notification-settings")}
          />
        </ListGroup>

        <GroupLabel>Activity</GroupLabel>
        <ListGroup inset={ROW_INSET}>
          <ListRow
            title="Trip history"
            icon="time-outline"
            category="routine"
            onPress={() => router.push("/history")}
          />
          <ListRow
            title="Insights"
            icon="bulb-outline"
            category="carpark"
            onPress={() => router.push("/recommendations")}
          />
        </ListGroup>

        <GroupLabel>About</GroupLabel>
        <ListGroup>
          <ListRow title="Version" value={version} />
          <ListRow title="Region" value="Singapore (ap-southeast-1)" />
          <ListRow title="API" value={apiUrl.replace(/^https?:\/\//, "")} />
        </ListGroup>

        <Button
          label="Sign out"
          icon="log-out-outline"
          variant="dangerSoft"
          onPress={() => void signOut()}
          style={styles.signOut}
        />
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.xl, paddingTop: space.xs },
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.lg },
  signOut: { marginTop: space.xxl },
}));

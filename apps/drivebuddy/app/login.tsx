import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import { AuthHero } from "@/components/auth-hero";
import { Banner, Button, Card, IconWell, Screen, Text, TextField } from "@/components/ui";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const t = useTheme();
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHero title={"Drive smarter\nin Singapore."} />

          <View style={styles.intro}>
            <Text variant="title2">Welcome back</Text>
            <Text variant="subhead" tone="secondary">
              Live ERP, traffic and fuel alerts, trip costs and an AI co-pilot you can talk to.
            </Text>
          </View>

          {error ? <Banner tone="danger" icon="alert-circle-outline" message={error} /> : null}

          <TextField
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            icon="lock-closed-outline"
            placeholder="Your password"
            secure
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => void onSubmit()}
          />

          <Button label="Sign in" onPress={() => void onSubmit()} loading={busy} />

          {Platform.OS === "web" ? (
            <Card
              variant="muted"
              accessibilityLabel="Use the demo account"
              onPress={() => {
                setEmail("demo@drivebuddy.app");
                setPassword("DriveBuddy123!");
              }}
              style={styles.demo}
            >
              <IconWell icon="flash-outline" category="traffic" size={38} />
              <View style={styles.flex}>
                <Text variant="subheadStrong">Use the demo account</Text>
                <Text variant="caption" tone="secondary">
                  demo@drivebuddy.app · DriveBuddy123!
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={t.color.textSecondary} />
            </Card>
          ) : null}

          <View style={styles.footer}>
            <Text variant="subhead" tone="secondary">
              New here?
            </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={10} accessibilityRole="link">
                <Text variant="subheadStrong" style={styles.link}>
                  Create an account
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1, minWidth: 0 },
  content: { flexGrow: 1, padding: space.xl, gap: space.lg },
  intro: { gap: space.xs, marginTop: space.sm },
  demo: { flexDirection: "row", alignItems: "center", gap: space.md },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: "auto",
    paddingTop: space.md,
  },
  link: { textDecorationLine: "underline" },
}));

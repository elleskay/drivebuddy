import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { makeStyles } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import { AuthHero } from "@/components/auth-hero";
import { Banner, Button, Screen, Text, TextField } from "@/components/ui";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const styles = useStyles();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp(email.trim(), password, fullName.trim());
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not create account. Check your connection.",
      );
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
          <AuthHero title={"Your co-pilot\nfor the road."} />

          <View style={styles.intro}>
            <Text variant="title2">Create your account</Text>
            <Text variant="subhead" tone="secondary">
              It takes less than a minute.
            </Text>
          </View>

          {error ? <Banner tone="danger" icon="alert-circle-outline" message={error} /> : null}

          <TextField
            label="Full name"
            icon="person-outline"
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            value={fullName}
            onChangeText={setFullName}
          />
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
            placeholder="At least 8 characters"
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => void onSubmit()}
          />

          <Button label="Create account" onPress={() => void onSubmit()} loading={busy} />

          <View style={styles.footer}>
            <Text variant="subhead" tone="secondary">
              Already have an account?
            </Text>
            <Link href="/login" asChild>
              <Pressable hitSlop={10} accessibilityRole="link">
                <Text variant="subheadStrong" style={styles.link}>
                  Sign in
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
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: space.xl, gap: space.lg },
  intro: { gap: space.xs, marginTop: space.sm },
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

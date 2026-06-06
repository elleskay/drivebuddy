import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui";
import { colors, gradients, radius, shadow, spacing } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.brandWrap}>
          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Ionicons name="car-sport" size={34} color="#fff" />
          </LinearGradient>
          <Text style={styles.brand}>DriveBuddy</Text>
          <Text style={styles.subtitle}>Your smart driving companion</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button label="Sign in" onPress={onSubmit} loading={busy} style={{ marginTop: spacing.sm }} />

        {Platform.OS === "web" ? (
          <Pressable
            style={styles.demo}
            onPress={() => {
              setEmail("demo@drivebuddy.app");
              setPassword("DriveBuddy123!");
            }}
          >
            <Text style={styles.demoText}>Use the demo account</Text>
            <Text style={styles.demoSub}>demo@drivebuddy.app · DriveBuddy123!</Text>
          </Pressable>
        ) : null}

        <Link href="/register" style={styles.linkRow}>
          <Text style={styles.linkMuted}>New here? </Text>
          <Text style={styles.link}>Create an account</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  brandWrap: { alignItems: "center", marginBottom: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadow,
    shadowOpacity: 0.25,
    shadowColor: "#4338ca",
  },
  brand: { color: colors.text, fontSize: 32, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 15, textAlign: "center", marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  demo: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  demoText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  demoSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  linkRow: { marginTop: 18, textAlign: "center" },
  linkMuted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: "700" },
  error: { color: colors.danger, textAlign: "center" },
});

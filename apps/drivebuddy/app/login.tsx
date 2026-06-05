import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

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
        <Text style={styles.brand}>DriveBuddy</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6b7a99"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7a99"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={onSubmit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>

        <Link href="/register" style={styles.linkRow}>
          <Text style={styles.linkMuted}>New here? </Text>
          <Text style={styles.link}>Create an account</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  brand: { color: "#4f8cff", fontSize: 34, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#9fb0d0", fontSize: 16, textAlign: "center", marginBottom: 12 },
  input: {
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#e7eefc",
    fontSize: 16,
  },
  button: { backgroundColor: "#4f8cff", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkRow: { marginTop: 18, textAlign: "center" },
  linkMuted: { color: "#9fb0d0" },
  link: { color: "#4f8cff", fontWeight: "700" },
  error: { color: "#ff6b6b", textAlign: "center" },
});

import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Profile } from "@/lib/api";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p: Profile = await api.getProfile();
        setEmail(p.email);
        setFullName(p.fullName ?? "");
        setGender(p.gender ?? "");
        setDateOfBirth(p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "");
        setHomeAddress(p.homeAddress ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      await api.updateProfile({
        fullName: fullName.trim() || undefined,
        gender: gender.trim() || undefined,
        dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ? dateOfBirth : undefined,
        homeAddress: homeAddress.trim() || undefined,
      });
      setMsg("Saved ✓");
    } catch {
      setMsg("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f8cff" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Field label="Email">
          <Text style={styles.readonly}>{email}</Text>
        </Field>
        <Field label="Full name">
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor="#6b7a99" />
        </Field>
        <Field label="Gender">
          <TextInput
            style={styles.input}
            value={gender}
            onChangeText={setGender}
            placeholder="e.g. Male / Female / Other"
            placeholderTextColor="#6b7a99"
          />
        </Field>
        <Field label="Date of birth (YYYY-MM-DD)">
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="1995-06-15"
            placeholderTextColor="#6b7a99"
            autoCapitalize="none"
          />
        </Field>
        <Field label="Home address">
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={homeAddress}
            onChangeText={setHomeAddress}
            multiline
            placeholderTextColor="#6b7a99"
          />
        </Field>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <Pressable style={[styles.button, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save changes</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  inner: { padding: 20, gap: 14 },
  field: { gap: 6 },
  label: { color: "#9fb0d0", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#e7eefc",
    fontSize: 16,
  },
  readonly: { color: "#9fb0d0", fontSize: 16, paddingVertical: 12 },
  button: { backgroundColor: "#4f8cff", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  msg: { color: "#7ee0a2", textAlign: "center" },
});

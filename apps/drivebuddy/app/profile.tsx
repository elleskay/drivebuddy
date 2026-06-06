import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SkeletonList } from "@/components/skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Profile } from "@/lib/api";
import { Button } from "@/components/ui";

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
      setMsg("Saved");
    } catch {
      setMsg("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonList />
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
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor="#94a3b8" />
        </Field>
        <Field label="Gender">
          <TextInput
            style={styles.input}
            value={gender}
            onChangeText={setGender}
            placeholder="e.g. Male / Female / Other"
            placeholderTextColor="#94a3b8"
          />
        </Field>
        <Field label="Date of birth (YYYY-MM-DD)">
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="1995-06-15"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
        </Field>
        <Field label="Home address">
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={homeAddress}
            onChangeText={setHomeAddress}
            multiline
            placeholderTextColor="#94a3b8"
          />
        </Field>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <Button label="Save changes" onPress={onSave} loading={saving} style={{ marginTop: 8 }} />
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
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, backgroundColor: "#f5f7fb", justifyContent: "center", alignItems: "center" },
  inner: { padding: 20, gap: 14 },
  field: { gap: 6 },
  label: { color: "#5b6b86", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0f172a",
    fontSize: 16,
  },
  readonly: { color: "#5b6b86", fontSize: 16, paddingVertical: 12 },
  msg: { color: "#16a34a", textAlign: "center" },
});

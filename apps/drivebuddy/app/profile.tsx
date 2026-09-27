import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { api, type Profile } from "@/lib/api";
import { makeStyles } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import { SkeletonList } from "@/components/skeleton";
import { Avatar, Banner, Button, Screen, ScreenHeader, Text, TextField } from "@/components/ui";

export default function ProfileScreen() {
  const styles = useStyles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
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
      setMsg({ ok: true, text: "Profile saved." });
    } catch {
      setMsg({ ok: false, text: "Could not save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <SkeletonList />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Profile" subtitle="Used to personalise alerts and insights" />

        <View style={styles.identity}>
          <Avatar name={fullName || email} size={64} />
          <View style={styles.flex}>
            <Text variant="title3" numberOfLines={1}>
              {fullName || "Your name"}
            </Text>
            <Text variant="subhead" tone="secondary" numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        <TextField
          label="Full name"
          icon="person-outline"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoComplete="name"
        />
        <TextField
          label="Gender"
          icon="male-female-outline"
          value={gender}
          onChangeText={setGender}
          placeholder="e.g. Male / Female / Other"
        />
        <TextField
          label="Date of birth"
          icon="calendar-outline"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        <TextField
          label="Home address"
          icon="home-outline"
          value={homeAddress}
          onChangeText={setHomeAddress}
          multiline
        />

        {msg ? (
          <Banner
            tone={msg.ok ? "success" : "danger"}
            icon={msg.ok ? "checkmark-circle-outline" : "alert-circle-outline"}
            message={msg.text}
          />
        ) : null}

        <Button label="Save changes" onPress={() => void onSave()} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.xl, paddingTop: space.xs, gap: space.lg },
  identity: { flexDirection: "row", alignItems: "center", gap: space.lg, marginBottom: space.xs },
}));

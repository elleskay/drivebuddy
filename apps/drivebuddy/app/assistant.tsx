import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { api, ApiError } from "@/lib/api";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

let seq = 0;
const nextId = () => `m${seq++}`;

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: nextId(), role: "assistant", text: "Hi! I'm DriveBuddy. Ask me about ERP, traffic, parking, fuel, or anything driving in Singapore." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const rec = useRef<Audio.Recording | null>(null);
  const sound = useRef<Audio.Sound | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);

  const append = useCallback((m: Msg) => {
    setMessages((prev) => [...prev, m]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const playAudio = useCallback(async (base64: string) => {
    try {
      const uri = `${FileSystem.cacheDirectory}reply-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await sound.current?.unloadAsync();
      const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      sound.current = s;
    } catch {
      // playback is optional; the text answer already shows
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setInput("");
      append({ id: nextId(), role: "user", text: q });
      setBusy(true);
      try {
        const res = await api.aiAsk(q, true);
        append({ id: nextId(), role: "assistant", text: res.answer });
        if (res.audio) void playAudio(res.audio.base64);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Something went wrong. Try again.";
        append({ id: nextId(), role: "assistant", text: `⚠️ ${msg}` });
      } finally {
        setBusy(false);
      }
    },
    [append, busy, playAudio],
  );

  const startRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        append({ id: nextId(), role: "assistant", text: "⚠️ Microphone permission is needed for voice." });
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      rec.current = recording;
      setRecording(true);
    } catch {
      append({ id: nextId(), role: "assistant", text: "⚠️ Couldn't start recording." });
    }
  }, [append]);

  const stopRecording = useCallback(async () => {
    const r = rec.current;
    if (!r) return;
    setRecording(false);
    setBusy(true);
    try {
      await r.stopAndUnloadAsync();
      const uri = r.getURI();
      rec.current = null;
      if (!uri) throw new Error("no audio");
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      append({ id: nextId(), role: "user", text: "🎤 (voice message)" });
      const res = await api.aiVoice(base64, "m4a", true);
      setMessages((prev) =>
        prev.map((m) => (m.text === "🎤 (voice message)" && m.role === "user" ? { ...m, text: res.transcript || "🎤 (voice message)" } : m)),
      );
      append({ id: nextId(), role: "assistant", text: res.answer });
      if (res.audio) void playAudio(res.audio.base64);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't process the recording.";
      append({ id: nextId(), role: "assistant", text: `⚠️ ${msg}` });
    } finally {
      setBusy(false);
    }
  }, [append, playAudio]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.user : styles.assistant]}>
              <Text style={item.role === "user" ? styles.userText : styles.assistantText}>{item.text}</Text>
            </View>
          )}
        />
        {busy ? (
          <View style={styles.thinking}>
            <ActivityIndicator color="#4f8cff" />
            <Text style={styles.thinkingText}>Thinking…</Text>
          </View>
        ) : null}
        <View style={styles.inputBar}>
          <Pressable
            style={[styles.mic, recording && styles.micActive]}
            onPress={recording ? stopRecording : startRecording}
            disabled={busy && !recording}
          >
            <Text style={styles.micIcon}>{recording ? "⏹" : "🎤"}</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={recording ? "Listening…" : "Ask DriveBuddy…"}
            placeholderTextColor="#5a6b8c"
            editable={!recording}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable style={styles.sendBtn} onPress={() => send(input)} disabled={busy || !input.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: "85%", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  user: { alignSelf: "flex-end", backgroundColor: "#4f8cff" },
  assistant: { alignSelf: "flex-start", backgroundColor: "#131c2e", borderColor: "#243049", borderWidth: 1 },
  userText: { color: "#fff", fontSize: 15 },
  assistantText: { color: "#e7eefc", fontSize: 15 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingBottom: 6 },
  thinkingText: { color: "#9fb0d0", fontSize: 13 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopColor: "#243049",
    borderTopWidth: 1,
    backgroundColor: "#0b1220",
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  micActive: { backgroundColor: "#e5484d", borderColor: "#e5484d" },
  micIcon: { fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#e7eefc",
    fontSize: 15,
  },
  sendBtn: { backgroundColor: "#4f8cff", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11 },
  sendText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});

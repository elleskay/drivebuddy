import { useCallback, useEffect, useRef, useState } from "react";
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
  const [continuous, setContinuous] = useState(false); // hands-free loop
  const rec = useRef<Audio.Recording | null>(null);
  const sound = useRef<Audio.Sound | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);
  const continuousRef = useRef(false);
  const listenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<() => void>();
  const stopRef = useRef<() => void>();

  // Hands-free has no on-device voice-activity detection, so each turn listens
  // for a fixed window then auto-sends.
  const LISTEN_MS = 7000;

  useEffect(() => {
    continuousRef.current = continuous;
  }, [continuous]);

  const append = useCallback((m: Msg) => {
    setMessages((prev) => [...prev, m]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const playAudio = useCallback(async (base64: string, onDone?: () => void) => {
    try {
      const uri = `${FileSystem.cacheDirectory}reply-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await sound.current?.unloadAsync();
      const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status) => {
        if (status.isLoaded && status.didJustFinish) onDone?.();
      });
      sound.current = s;
    } catch {
      // playback is optional; the text answer already shows
      onDone?.();
    }
  }, []);

  // In hands-free mode, re-arm listening after a reply finishes.
  const maybeContinue = useCallback(() => {
    if (!continuousRef.current || rec.current) return;
    setTimeout(() => {
      if (continuousRef.current && !rec.current) startRef.current?.();
    }, 500);
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
        append({ id: nextId(), role: "assistant", text: msg });
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
        append({ id: nextId(), role: "assistant", text: "Microphone permission is needed for voice." });
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      rec.current = recording;
      setRecording(true);
      // Hands-free: auto-stop after a fixed listen window.
      if (continuousRef.current) {
        if (listenTimer.current) clearTimeout(listenTimer.current);
        listenTimer.current = setTimeout(() => stopRef.current?.(), LISTEN_MS);
      }
    } catch {
      append({ id: nextId(), role: "assistant", text: "Couldn't start recording." });
    }
  }, [append]);

  const stopRecording = useCallback(async () => {
    const r = rec.current;
    if (!r) return;
    if (listenTimer.current) {
      clearTimeout(listenTimer.current);
      listenTimer.current = null;
    }
    setRecording(false);
    setBusy(true);
    try {
      await r.stopAndUnloadAsync();
      const uri = r.getURI();
      rec.current = null;
      if (!uri) throw new Error("no audio");
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      append({ id: nextId(), role: "user", text: "(voice message)" });
      const res = await api.aiVoice(base64, "m4a", true);
      setMessages((prev) =>
        prev.map((m) => (m.text === "(voice message)" && m.role === "user" ? { ...m, text: res.transcript || "(voice message)" } : m)),
      );
      append({ id: nextId(), role: "assistant", text: res.answer });
      if (res.audio) void playAudio(res.audio.base64, maybeContinue);
      else maybeContinue();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't process the recording.";
      append({ id: nextId(), role: "assistant", text: msg });
      maybeContinue();
    } finally {
      setBusy(false);
    }
  }, [append, playAudio, maybeContinue]);

  // Keep refs to the latest start/stop so the hands-free loop can call across them.
  useEffect(() => {
    startRef.current = startRecording;
    stopRef.current = stopRecording;
  }, [startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (listenTimer.current) clearTimeout(listenTimer.current);
    };
  }, []);

  const toggleContinuous = useCallback(() => {
    setContinuous((on) => {
      const next = !on;
      continuousRef.current = next;
      if (next) {
        if (!rec.current && !busy) void startRecording();
      } else {
        if (listenTimer.current) clearTimeout(listenTimer.current);
        if (rec.current) void stopRecording();
      }
      return next;
    });
  }, [busy, startRecording, stopRecording]);

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
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.thinkingText}>Thinking…</Text>
          </View>
        ) : null}
        <Pressable
          style={[styles.handsFree, continuous && styles.handsFreeOn]}
          onPress={toggleContinuous}
        >
          <Text style={[styles.handsFreeText, continuous && styles.handsFreeTextOn]}>
            {continuous ? "Hands-free on — listening, tap to stop" : "Start hands-free mode"}
          </Text>
        </Pressable>
        <View style={styles.inputBar}>
          <Pressable
            style={[styles.mic, recording && styles.micActive]}
            onPress={recording ? stopRecording : startRecording}
            disabled={busy && !recording}
          >
            <Text style={styles.micIcon}>{recording ? "Stop" : "Mic"}</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={recording ? "Listening…" : "Ask DriveBuddy…"}
            placeholderTextColor="#94a3b8"
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
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: "85%", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  user: { alignSelf: "flex-end", backgroundColor: "#2563eb" },
  assistant: { alignSelf: "flex-start", backgroundColor: "#ffffff", borderColor: "#e4e9f2", borderWidth: 1 },
  userText: { color: "#fff", fontSize: 15 },
  assistantText: { color: "#0f172a", fontSize: 15 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingBottom: 6 },
  thinkingText: { color: "#5b6b86", fontSize: 13 },
  handsFree: {
    alignSelf: "center",
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e9f2",
    backgroundColor: "#ffffff",
  },
  handsFreeOn: { backgroundColor: "#e8f0ff", borderColor: "#2563eb" },
  handsFreeText: { color: "#5b6b86", fontSize: 12, fontWeight: "700" },
  handsFreeTextOn: { color: "#2563eb" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopColor: "#e4e9f2",
    borderTopWidth: 1,
    backgroundColor: "#f5f7fb",
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  micActive: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  micIcon: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  input: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#0f172a",
    fontSize: 15,
  },
  sendBtn: { backgroundColor: "#2563eb", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11 },
  sendText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { api, ApiError } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { font, radius, space } from "@/lib/theme";
import { IconButton, Screen, ScreenHeader, Text } from "@/components/ui";

const SUGGESTIONS = [
  "ERP charges right now?",
  "Cheapest petrol today",
  "Any traffic incidents?",
  "Where can I park in Orchard?",
];

// react-native-web draws the browser focus outline around the input.
const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

let seq = 0;
const nextId = () => `m${seq++}`;

export default function AssistantScreen() {
  const t = useTheme();
  const styles = useStyles();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nextId(),
      role: "assistant",
      text: "Hi! I'm DriveBuddy. Ask me about ERP, traffic, parking, fuel, or anything driving in Singapore.",
    },
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
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await sound.current?.unloadAsync();
      const { sound: s } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) onDone?.();
        },
      );
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
        append({
          id: nextId(),
          role: "assistant",
          text: "Microphone permission is needed for voice.",
        });
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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      append({ id: nextId(), role: "user", text: "(voice message)" });
      const res = await api.aiVoice(base64, "m4a", true);
      setMessages((prev) =>
        prev.map((m) =>
          m.text === "(voice message)" && m.role === "user"
            ? { ...m, text: res.transcript || "(voice message)" }
            : m,
        ),
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
    startRef.current = () => void startRecording();
    stopRef.current = () => void stopRecording();
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

  const canSend = !busy && input.trim().length > 0;
  const showSuggestions = messages.length === 1 && !busy && !recording;

  return (
    <Screen edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader
          title="Assistant"
          subtitle={
            continuous
              ? "Hands-free on: listening each turn, replies aloud"
              : "Ask about ERP, traffic, parking or fuel"
          }
          right={
            <IconButton
              icon={continuous ? "ear" : "ear-outline"}
              variant={continuous ? "accent" : "surface"}
              accessibilityLabel={continuous ? "Stop hands-free mode" : "Start hands-free mode"}
              onPress={toggleContinuous}
            />
          }
          style={styles.header}
        />

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) =>
            item.role === "user" ? (
              <View style={[styles.bubble, styles.user]}>
                <Text variant="body" tone="onAccent">
                  {item.text}
                </Text>
              </View>
            ) : (
              <View style={styles.assistantRow}>
                <View style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={14} color={t.color.accentInk} />
                </View>
                <View style={[styles.bubble, styles.assistant]}>
                  <Text variant="body">{item.text}</Text>
                </View>
              </View>
            )
          }
          ListFooterComponent={
            busy ? (
              <View style={styles.assistantRow}>
                <View style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={14} color={t.color.accentInk} />
                </View>
                <View style={[styles.bubble, styles.assistant]}>
                  <TypingDots />
                </View>
              </View>
            ) : showSuggestions ? (
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => void send(s)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                  >
                    <Text variant="subheadStrong">{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />

        <View style={styles.composer}>
          <IconButton
            icon={recording ? "stop" : "mic-outline"}
            variant={recording ? "danger" : "surface"}
            accessibilityLabel={recording ? "Stop recording" : "Record a voice question"}
            onPress={() => void (recording ? stopRecording() : startRecording())}
            disabled={busy && !recording}
            size={48}
          />
          <View style={[styles.inputWrap, recording && styles.inputWrapRecording]}>
            <TextInput
              style={[styles.input, webNoOutline]}
              value={input}
              onChangeText={setInput}
              placeholder={recording ? "Listening…" : "Ask DriveBuddy…"}
              placeholderTextColor={recording ? t.color.danger : t.color.textTertiary}
              selectionColor={t.color.accentInk}
              editable={!recording}
              onSubmitEditing={() => void send(input)}
              returnKeyType="send"
            />
          </View>
          <IconButton
            icon="arrow-up"
            variant={canSend ? "accent" : "muted"}
            color={canSend ? undefined : t.color.textTertiary}
            accessibilityLabel="Send"
            onPress={() => void send(input)}
            disabled={!canSend}
            size={48}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Three dots pulsing in sequence while the assistant composes a reply. */
function TypingDots() {
  const t = useTheme();
  const styles = useStyles();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <View style={styles.dots} accessibilityLabel="DriveBuddy is typing">
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: t.color.textSecondary,
              opacity: v.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0, 1, 2, 3, 4].map((k) => (k === i + 1 ? 1 : 0.25)),
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm },
  list: { paddingHorizontal: space.xl, paddingVertical: space.md, gap: space.md },

  bubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    paddingVertical: 11,
    paddingHorizontal: space.lg,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: t.color.accent,
    borderBottomRightRadius: 6,
  },
  assistantRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.color.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  assistant: {
    flexShrink: 1,
    backgroundColor: t.color.surface,
    borderColor: t.color.border,
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },

  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.sm,
    paddingLeft: 36,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    backgroundColor: t.color.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipPressed: { backgroundColor: t.color.surfaceMuted },

  dots: { flexDirection: "row", gap: 5, paddingVertical: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  inputWrap: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    paddingHorizontal: space.lg,
  },
  inputWrapRecording: { borderColor: t.color.danger },
  input: { color: t.color.text, fontFamily: font.regular, fontSize: 16, paddingVertical: 0 },
}));

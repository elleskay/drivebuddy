import { Alert, Platform } from "react-native";

// react-native-web implements Alert.alert as a no-op, so confirmations and error
// notices silently vanish in the web demo. These helpers use the browser's
// confirm/alert on web and the native Alert elsewhere.

export function confirmAction(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${opts.title}\n\n${opts.message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: opts.confirmLabel,
          style: opts.destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message: string): void {
  if (Platform.OS === "web") {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

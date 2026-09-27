import { Platform, Share } from "react-native";

/**
 * Hands a text file to the user: a browser download on web (react-native-web's
 * Share needs navigator.share, which most desktop browsers lack), the OS share
 * sheet on native (core Share, no extra native module).
 */
export async function shareTextFile(filename: string, text: string, mime: string): Promise<void> {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: filename, message: text });
}

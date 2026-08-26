import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Mako Android voice and asset integration", () => {
  it("uses a public image origin when running through Capacitor", () => {
    const source = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
    expect(source).toContain('window.location.protocol === "capacitor:"');
    expect(source).toContain("https://marokecho-jrrh7cuh.manus.space");
  });

  it("declares and registers the Android-native microphone recorder", () => {
    const manifest = readFileSync(resolve(projectRoot, "android/app/src/main/AndroidManifest.xml"), "utf8");
    const activity = readFileSync(resolve(projectRoot, "android/app/src/main/java/com/abdelatizarzori/makoai/MainActivity.java"), "utf8");
    const plugin = readFileSync(resolve(projectRoot, "android/app/src/main/java/com/abdelatizarzori/makoai/NativeAudioRecorderPlugin.java"), "utf8");

    expect(manifest).toContain("android.permission.RECORD_AUDIO");
    expect(activity).toContain("registerPlugin(NativeAudioRecorderPlugin.class)");
    expect(plugin).toContain('name = "NativeAudioRecorder"');
    expect(plugin).toContain("MediaRecorder.AudioSource.MIC");
    expect(plugin).toContain('result.put("mimeType", "audio/mp4")');
  });
});

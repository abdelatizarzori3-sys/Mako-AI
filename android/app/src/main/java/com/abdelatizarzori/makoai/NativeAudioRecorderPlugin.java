package com.abdelatizarzori.makoai;

import android.Manifest;
import android.app.Activity;
import android.media.MediaRecorder;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

@CapacitorPlugin(
    name = "NativeAudioRecorder",
    permissions = {
        @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
    }
)
public class NativeAudioRecorderPlugin extends Plugin {
    private MediaRecorder recorder;
    private File recordingFile;
    private boolean recording = false;

    @PluginMethod
    public void startRecording(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("AUDIO_UNAVAILABLE");
            return;
        }
        activity.runOnUiThread(() -> startOnMainThread(call));
    }

    private void startOnMainThread(PluginCall call) {
        if (recording) {
            call.reject("ALREADY_RECORDING");
            return;
        }
        try {
            recordingFile = new File(getContext().getCacheDir(), "mako-voice-" + System.currentTimeMillis() + ".m4a");
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioEncodingBitRate(64000);
            recorder.setAudioSamplingRate(44100);
            recorder.setOutputFile(recordingFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            recording = true;
            call.resolve();
        } catch (Exception error) {
            releaseRecorder();
            deleteRecording();
            call.reject("AUDIO_START_FAILED");
        }
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("AUDIO_UNAVAILABLE");
            return;
        }
        activity.runOnUiThread(() -> stopOnMainThread(call));
    }

    private void stopOnMainThread(PluginCall call) {
        if (!recording || recorder == null || recordingFile == null) {
            call.reject("NOT_RECORDING");
            return;
        }
        try {
            recorder.stop();
            releaseRecorder();
            recording = false;
            long size = recordingFile.length();
            if (size <= 0 || size > 8L * 1024L * 1024L) {
                deleteRecording();
                call.reject(size > 8L * 1024L * 1024L ? "AUDIO_TOO_LARGE" : "AUDIO_EMPTY");
                return;
            }
            byte[] data = readAllBytes(recordingFile);
            JSObject result = new JSObject();
            result.put("audioBase64", Base64.encodeToString(data, Base64.NO_WRAP));
            result.put("mimeType", "audio/mp4");
            result.put("size", data.length);
            deleteRecording();
            call.resolve(result);
        } catch (RuntimeException error) {
            releaseRecorder();
            recording = false;
            deleteRecording();
            call.reject("AUDIO_TOO_SHORT");
        } catch (IOException error) {
            releaseRecorder();
            recording = false;
            deleteRecording();
            call.reject("AUDIO_READ_FAILED");
        }
    }

    private byte[] readAllBytes(File file) throws IOException {
        int size = (int) file.length();
        byte[] data = new byte[size];
        try (FileInputStream stream = new FileInputStream(file)) {
            int offset = 0;
            while (offset < data.length) {
                int count = stream.read(data, offset, data.length - offset);
                if (count < 0) break;
                offset += count;
            }
            if (offset != data.length) throw new IOException("Could not read complete audio file");
        }
        return data;
    }

    private void releaseRecorder() {
        if (recorder != null) {
            try { recorder.reset(); } catch (Exception ignored) { }
            try { recorder.release(); } catch (Exception ignored) { }
            recorder = null;
        }
    }

    private void deleteRecording() {
        if (recordingFile != null && recordingFile.exists()) recordingFile.delete();
        recordingFile = null;
    }
}

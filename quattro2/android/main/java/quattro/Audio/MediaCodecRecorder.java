//
//	MediaCodecRecorder.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.media.AudioFormat;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.os.IBinder;

public class MediaCodecRecorder extends AudioRecorder implements AudioInputUnit.AudioInputStreamDelegate {

    private AudioInputUnit input = null;

    private MediaFileWriter writer = null;
    private String url = null;

    public MediaCodecRecorder(Context c) {
        super(c);
        Intent intent = new Intent(applicationContext, AudioInputUnit.class);
        applicationContext.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    public void destroy() {
        close();
        input = null;
        delegate = null;
        applicationContext.unbindService(serviceConnection);
        applicationContext = null;
    }

    private ServiceConnection serviceConnection = new ServiceConnection() {
        public void onServiceConnected(ComponentName className, IBinder rawBinder) {
            input = ((AudioInputUnit.LocalBinder)rawBinder).getService();
            input.delegate = MediaCodecRecorder.this;
        }
        public void onServiceDisconnected(ComponentName classname) {}
    };

    private boolean prepare(int format) {
        MediaFormat outputFormat;
        if (format == AudioRecorder.kRecordingFormatWAV) {
            outputFormat = MediaFormat.createAudioFormat(
                    WavFileHeader.MIMETYPE_AUDIO_WAV,
                    AudioInputUnit.kSampleRate,
                    AudioInputUnit.kNumOfChannels);
            outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_16BIT);
        } else {
            int bitrate = 0;
            switch (format) {
                case AudioRecorder.kRecordingFormatAAC_256K:
                    bitrate = 256000;
                    break;
                case AudioRecorder.kRecordingFormatAAC_192K:
                    bitrate = 192000;
                    break;
                case AudioRecorder.kRecordingFormatAAC_128K:
                    bitrate = 128000;
                    break;
                case AudioRecorder.kRecordingFormatAAC_64K:
                    bitrate = 64000;
                    break;
                case AudioRecorder.kRecordingFormatWAV:
                default:
                    return false;
            }
            outputFormat = MediaFormat.createAudioFormat(
                    MediaFormat.MIMETYPE_AUDIO_AAC,
                    AudioInputUnit.kSampleRate,
                    AudioInputUnit.kNumOfChannels);
            outputFormat.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
            outputFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
        }
        writer = new MediaFileWriter();
        if (writer.open(url, outputFormat)) {
            return true;
        }
        writer = null;
        url = null;
        return false;
    }

    @Override
    public boolean create(String url, int format) {
        close();
        this.url = url;
        return prepare(format);
    }

    @Override
    public void record() {
        if (input != null) {
            input.start();
        }
    }

    @Override
    public void pause() {
        if (input != null) {
            input.pause();
        }
    }

    @Override
    public void stop(boolean shouldStopImmediate) {
        close();
        if ((url != null) && (delegate != null)) {
            delegate.audioRecorderDidFinishRecording(url);
        }
        url = null;
    }

    @Override
    public String file() {
        return ((writer != null) ? url : null);
    }

    @Override
    public float currentTime() {
        if ((input != null) && (writer != null)) {
            return input.currentTime();
        }
        return 0;
    }

    @Override
    public void volume(float vol) {
        if (vol < 0 || vol > 1.0)
            return;
        if (input != null) {
            input.setVolume(vol);
        }
    }

    @Override
    public float volume() {
        return (input != null) ? input.volume() : 0;
    }

    @Override
    public int status() {
        return (input != null) ? input.status() : kAudioInputStatusStop;
    }

    @Override
    public int numberOfChannels() {
        return AudioInputUnit.kNumOfChannels;
    }

    @Override
    public float peakPowerForChannel(int channel) {
        if (channel >= AudioInputUnit.kNumOfChannels)
            return -120.0f;
        return (input != null) ? input.peakPowerForChannel(channel) : -120.0f;
    }

    @Override
    public void input(boolean b) {
        /* not implemented yet. */
    }

    private void close() {
        if (input != null) {
            input.stop();
        }
        if (writer != null) {
            writer.close();
            writer = null;
        }
    }

    @Override
    public void inputStream(byte[] buffer) {
        if (writer != null) {
            writer.writePCM16(buffer);
        }
    }

}

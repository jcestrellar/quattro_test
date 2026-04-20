//
//	AudioInputUnit.java
//
//	Copyright 2024 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

import quattro.app.R;

public class AudioInputUnit extends Service {

    public interface AudioInputStreamDelegate {
        public abstract void inputStream(byte[] buffer);
    }

    public static final String CHANNEL_ID = "quattro.AudioInputUnit";

    private final IBinder binder = new LocalBinder();

    public class LocalBinder extends Binder {
        public AudioInputUnit getService() {
            return AudioInputUnit.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    public void onDestroy() {
        stop();
        super.onDestroy();
    }

    private void startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID, getString(R.string.microphone_in_use), NotificationManager.IMPORTANCE_DEFAULT
                );
                manager.createNotificationChannel(channel);
            }
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentTitle(getString(R.string.microphone_in_use))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            startForeground(0x1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(0x1001, notification);
        }
    }

    public static final int kSampleRate = 44100;
    public static final int kNumOfChannels = 2;
    public static final int kBytesPerFrame = (2 * kNumOfChannels);

    public  AudioInputStreamDelegate delegate = null;
    private AudioRecord audioRecord = null;

    private boolean recording = false;
    private int currentFrame = 0;
    private float gain = 1.0f;
    private AudioVolume.RMSAvaragePower power = new AudioVolume.RMSAvaragePower(0);

    private byte[] buffer = null;
    private ByteBuffer outputBuffer = null;

    private void preparer() {
        int bufferSize = AudioRecord.getMinBufferSize(kSampleRate, AudioFormat.CHANNEL_IN_STEREO, AudioFormat.ENCODING_PCM_16BIT);
        buffer = new byte[bufferSize];
        outputBuffer = ByteBuffer.allocate(bufferSize).order(ByteOrder.nativeOrder());

        currentFrame = 0;
        power.config(kSampleRate);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) { return; }
        }
        audioRecord = new AudioRecord(
                MediaRecorder.AudioSource.DEFAULT,
                kSampleRate,
                AudioFormat.CHANNEL_IN_STEREO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize);

        audioRecord.setPositionNotificationPeriod(bufferSize / kBytesPerFrame);
        audioRecord.setRecordPositionUpdateListener(new AudioRecord.OnRecordPositionUpdateListener() {
            @Override
            public void onPeriodicNotification(AudioRecord recorder) {
                int bytes = recorder.read(buffer, 0, buffer.length);
                if (bytes > 0) {
                    ByteBuffer inputBuffer = ByteBuffer.wrap(buffer, 0, bytes).order(ByteOrder.nativeOrder());
                    outputBuffer.clear();
                    float coef = AudioVolume.convert(gain);
                    for (int count = 0; count < bytes; count += kBytesPerFrame) {
                        float L = inputBuffer.getShort() * coef;
                        float R = inputBuffer.getShort() * coef;
                        outputBuffer.putShort((short)L);
                        outputBuffer.putShort((short)R);
                        power.set(0, L);
                        power.set(1, R);
                    }
                    outputBuffer.flip();
                    if (delegate != null) {
                        delegate.inputStream(outputBuffer.array());
                    }
                }
                int frames = bufferSize / kBytesPerFrame;
                power.update(frames);
                currentFrame += frames;
            }
            @Override
            public void onMarkerReached(AudioRecord recorder) {
                /* nothing to do */
            }
        });
    }

    void start() {
        if (audioRecord == null) {
            preparer();
        }
        if ((audioRecord != null) && !recording) {
            startForegroundNotification();
            audioRecord.startRecording();
            recording = true;
        }
    }

    void pause() {
        if (audioRecord != null && recording) {
            audioRecord.stop();
        }
        recording = false;
    }

    void stop() {
        pause();
        if (audioRecord != null) {
            audioRecord.release();
            audioRecord = null;
            stopForeground(true);
        }
    }

    public float currentTime() {
        return ((float)currentFrame / kSampleRate);
    }

    float volume() {
        return gain;
    }

    void setVolume(float volume) {
        gain = volume;
    }

    public int status() {
        if (audioRecord != null) {
            return recording ? AudioRecorder.kAudioInputStatusStart : AudioRecorder.kAudioInputStatusPause;
        }
        return AudioRecorder.kAudioInputStatusStop;
    }

    public float peakPowerForChannel(int channel) {
        float peakPower = -120.0f;
        if (recording) {
            float x = power.get(channel) / 32768.0f;
            if (x != 0) {
                x = (float)(20 * Math.log10(x));
                if (x > peakPower)
                    peakPower = x;
            }
        }
        return peakPower;
    }

}

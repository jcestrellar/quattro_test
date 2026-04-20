//
//	MediaCodecPlayer.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.MediaFormat;
import android.media.PlaybackParams;
import android.os.Build;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

public class MediaCodecPlayer extends AudioPlayer {

    private AudioOutput output = new AudioOutput();

    private MediaFileReader reader = null;
    private byte[] sampleBuffer = null;
    private int bufpos = 0;

    private int sampleRate = 0;
    private int channels = 0;
    private float duration = 0;

    private String url = null;

    public MediaCodecPlayer(Context c) {
        super(c);
    }

    @Override
    public void destroy() {
        close();
        output = null;
        delegate = null;
		applicationContext = null;
    }

    private boolean prepare() {
        reader = new MediaFileReader();
        if (reader.open(url)) {
            MediaFormat format = reader.getFileFormat();
            sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE);
            channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
            duration = format.getLong(MediaFormat.KEY_DURATION) / 1000000f;
            return true;
        }
        reader = null;
        url = null;
        return false;
    }

    @Override
    public boolean open(String url) {
        close();
        this.url = url;
        return prepare();
    }

    @Override
    public void play() {
        if (url != null) {
            output.start();
        }
    }

    @Override
    public void pause() {
        output.pause();
    }

    @Override
    public void stop() {
        close();
        if (url != null) {
            prepare();
        }
        if (delegate != null) {
            delegate.audioPlayerDidFinishPlaying(url);
        }
    }

    @Override
    public String file() {
        return url;
    }

    @Override
    public void locate(float time) {
        close();
        if (prepare() && (reader != null)) {
            reader.seekTo(time);
        }
    }

    @Override
    public float currentTime() {
        return (reader != null) ? reader.getSampleTime() / 1000000f : 0f;
    }

    @Override
    public float totalTime() {
        return (reader != null) ? duration : 0f;
    }

    @Override
    public void volume(float vol) {
        if (0 <= vol && vol <= 1.0) {
            output.setVolume(vol);
        }
    }

    @Override
    public float volume() {
        return output.volume();
    }

    @Override
    public void speed(float rate) {
        if (0.5f <= rate && rate <= 2.0f) {
            output.setSpeed(rate);
        }
    }

    @Override
    public float speed() {
        return output.speed();
    }

    @Override
    public void pitch(float cent) {
        if (-2400 <= cent && cent <= 2400) {
            output.setPitch(cent);
        }
    }

    @Override
    public float pitch() {
        return output.pitch();
    }

    @Override
    public int status() {
        return output.status();
    }

    @Override
    public int numberOfChannels() {
        return output.numberOfChannels();
    }

    @Override
    public float peakPowerForChannel(int channel) {
        return output.peakPowerForChannel(channel);
    }

    @Override
    public void output(boolean network) {
        /* not implemented yet. */
    }

    private void close() {
        output.stop();
        if (reader != null) {
            reader.close();
            reader = null;
            sampleBuffer = null;
        }
    }

    public int outputStream(byte[] buffer, int length) {
        int bytes = 0;
        while (length > 0) {
            if (sampleBuffer != null) {
                int n = sampleBuffer.length - bufpos;
                if (n > length) { n = length; }
                System.arraycopy(sampleBuffer, bufpos, buffer, bytes, n);
                bytes += n; length -= n; bufpos += n;
                if (bufpos == sampleBuffer.length) {
                    sampleBuffer = null;
                }
                continue;
            }
            sampleBuffer = reader.readPCM16();
            if (sampleBuffer == null) {
                break;
            }
            bufpos = 0;
        }
        return bytes;
    }

    private final class AudioOutput {

        private AudioTrack audioTrack = null;

        private boolean playing = false;
        private float gain = 1.0f;
        private float rate = 1.0f;
        private float cent = 0.0f;

        private final int kNumOfBuffers = 5;
        private int minBufferSize = 0;
        private byte[] audioBuffer = null;

        private AudioVolume.RMSAvaragePower power = new AudioVolume.RMSAvaragePower(kNumOfBuffers);

        private boolean create() {
            int channelConfig;
            switch (channels) {
                case 1: channelConfig = AudioFormat.CHANNEL_OUT_MONO; break;
                case 2: channelConfig = AudioFormat.CHANNEL_OUT_STEREO; break;
                case 3: channelConfig = AudioFormat.CHANNEL_OUT_STEREO | AudioFormat.CHANNEL_OUT_FRONT_CENTER; break;
                case 4: channelConfig = AudioFormat.CHANNEL_OUT_QUAD; break;
                case 5: channelConfig = AudioFormat.CHANNEL_OUT_QUAD | AudioFormat.CHANNEL_OUT_FRONT_CENTER; break;
                case 6: channelConfig = AudioFormat.CHANNEL_OUT_5POINT1; break;
                case 7: channelConfig = AudioFormat.CHANNEL_OUT_5POINT1 | AudioFormat.CHANNEL_OUT_BACK_CENTER; break;
                case 8: channelConfig = AudioFormat.CHANNEL_OUT_7POINT1_SURROUND; break;
                default:
                    return false;
            }
            minBufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, AudioFormat.ENCODING_PCM_16BIT);
            int bufferSize = minBufferSize * kNumOfBuffers;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                audioTrack = new AudioTrack(
                        new AudioAttributes.Builder()
                                .setLegacyStreamType(AudioManager.STREAM_MUSIC)
                                .build(),
                        new AudioFormat.Builder()
                                .setSampleRate(sampleRate)
                                .setChannelMask(channelConfig)
                                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .build(),
                        bufferSize,
                        AudioTrack.MODE_STREAM,
                        AudioManager.AUDIO_SESSION_ID_GENERATE);
            } else {
                audioTrack = new AudioTrack(
                        AudioManager.STREAM_MUSIC,
                        sampleRate,
                        channelConfig,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize,
                        AudioTrack.MODE_STREAM);
            }

            PlaybackParams playbackParams = audioTrack.getPlaybackParams();
            float pitch = (float)Math.pow(2, (cent / 1200));
            playbackParams.setSpeed(rate);
            playbackParams.setPitch(pitch);
            audioTrack.setPlaybackParams(playbackParams);

            power.config(sampleRate);

            audioBuffer = new byte[bufferSize];
            if (!charge()) {
                return false;
            }

            audioTrack.setPositionNotificationPeriod(minBufferSize / (Short.BYTES * channels));
            audioTrack.setPlaybackPositionUpdateListener(new AudioTrack.OnPlaybackPositionUpdateListener() {
                @Override
                public void onPeriodicNotification(AudioTrack audioTrack) {
                    int len = outputStream(audioBuffer, minBufferSize);
                    if (len > 0) {
                        amplitude(len);
                        Arrays.fill(audioBuffer, len, minBufferSize, (byte)0);
                        audioTrack.write(audioBuffer, 0, minBufferSize);
                    } else if (len == 0) {
                        close();
                        prepare();
                        if (delegate != null) {
                            delegate.audioPlayerDidEndSong(url);
                            delegate.audioPlayerDidFinishPlaying(url);
                        }
                    }
                    power.update(minBufferSize / (Short.BYTES * channels));
                }
                @Override
                public void onMarkerReached(AudioTrack audioTrack) {
                    /* nothing to do */
                }
            });
            return true;
        }

        private void amplitude(int len) {
            float coef = AudioVolume.convert(gain);
            ByteBuffer inputBuffer = ByteBuffer.wrap(audioBuffer).order(ByteOrder.nativeOrder());
            ByteBuffer outputBuffer = ByteBuffer.wrap(audioBuffer).order(ByteOrder.nativeOrder());
            int frames = len / (Short.BYTES * channels);
            for (int i = 0; i < frames; i++) {
                for (int ch = 0; ch < channels; ch++) {
                    float v = inputBuffer.getShort() * coef;
                    outputBuffer.putShort((short)v);
                    power.set(ch, v);
                }
            }
        }

        private boolean charge() {
            for (int i = 0; i < kNumOfBuffers; i++) {
                int len = outputStream(audioBuffer, minBufferSize);
                if (len > 0) {
                    amplitude(len);
                    Arrays.fill(audioBuffer, len, minBufferSize, (byte)0);
                    if (audioTrack.write(audioBuffer, 0, minBufferSize) < 0) {
                        if (delegate != null) {
                            delegate.audioPlayerErrorDidOccur(url);
                        }
                        return false;
                    }
                }
                power.update(minBufferSize / (Short.BYTES * channels));
            }
            return true;
        }

        void start() {
            if (audioTrack == null) {
                if (!create()) return;
            }
            if (!playing) {
                if (audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PAUSED) {
                    if (!charge()) return;
                }
                audioTrack.play();
                playing = true;
            }
        }

        void pause() {
            if (audioTrack != null && playing) {
                audioTrack.pause();
            }
            playing = false;
        }

        void stop() {
            if (audioTrack != null) {
                audioTrack.stop();
                audioTrack.release();
                audioTrack = null;
            }
            playing = false;
        }

        float volume() {
            return gain;
        }

        void setVolume(float volume) {
            gain = volume;
        }

        float speed() {
            return rate;
        }

        void setSpeed(float rate) {
            this.rate = rate;
            if (audioTrack != null) {
                audioTrack.setPlaybackParams(audioTrack.getPlaybackParams().setSpeed(rate));
            }
        }

        float pitch() {
            return cent;
        }

        void setPitch(float cent) {
            this.cent = cent;
            if (audioTrack != null) {
                float pitch = (float)Math.pow(2, (cent / 1200));
                audioTrack.setPlaybackParams(audioTrack.getPlaybackParams().setPitch(pitch));
            }
        }


        public int status() {
            if (audioTrack != null) {
                switch (audioTrack.getPlayState()) {
                    case AudioTrack.PLAYSTATE_PLAYING:
                        return AudioPlayer.kAudioOutputStatusStart;
                    case AudioTrack.PLAYSTATE_PAUSED:
                        return AudioPlayer.kAudioOutputStatusPause;
                }
            }
            return AudioPlayer.kAudioOutputStatusStop;
        }

        public int numberOfChannels() {
            return channels;
        }

        public float peakPowerForChannel(int channel) {
            float peakPower = -120.0f;
            if (playing) {
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

}

//
//	SamplePlayer.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.MediaFormat;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

public class SamplePlayer {

	private static final int kNumOfAudioBuffers = 5;

	public static final int kSamplePlayerStateStop     = 0;
	public static final int kSamplePlayerStateStopping = 1;
	public static final int kSamplePlayerStatePlay     = 2;
	public static final int kSamplePlayerStatePause    = 3;

	private Context applicationContext;

	public SamplePlayerDelegate delegate = null;

	private MediaFileReader reader = null;
	private byte[] sampleBuffer = null;
	private int bufpos = 0;

	private String url = null;

	private float totalTime = 0;
	private float currentTime = 0;
	private long currentFrame = 0;

	private float locateTime = 0;
	private float beginTime = 0;
	private float endTime = 0;

	private boolean trigger = false;
	private boolean playing = false;
	private boolean paused = false;

	private long fadeOutStartFrame = 0;
	private boolean immediate = false;
	private boolean bos = false;

	private int repeat;
	private int count;

	private float gain = 1.0f;
	private float rate = 1.0f;
	private float cent = 0;
	private float fadeIn = 0;
	private float fadeOut = 0;

	private float __gain = 0;

	protected boolean ENABLE_PLAYBACKPARAMS = true;
	protected AudioTrack audioTrack = null;
	private HandlerThread renderThread = null;
	private int minBufferSize = 0;
	private byte[] audioBuffer = null;
	private int sampleRate = 0;
	private int channels = 0;
	private int bytesPerFrame = 0;
	private AudioVolume.RMSAvaragePower power = new AudioVolume.RMSAvaragePower(kNumOfAudioBuffers);

	public SamplePlayer(Context c) { applicationContext = c; }

	public void destroy() {
		close();
		delegate = null;
	}

	public void close() {
		closeAudioTrack();
		closeFile();
		term();
		currentTime = totalTime = 0;
		locateTime = beginTime = endTime = 0;
	}

	private void closeAudioTrack() {
		if (audioTrack != null) {
			audioTrack.stop();
			audioTrack.release();
			audioTrack = null;
			audioBuffer = null;
		}
		if (renderThread != null) {
			renderThread.quit();
			renderThread = null;
		}
		power.clear();
		stopped();
	}

	private void closeFile() {
		if (reader != null) {
			reader.close();
			reader = null;
			sampleBuffer = null;
		}
	}

	private void stopped() { stopped(false); }

	private void stopped(boolean eos) {
		playing = paused = false;
		currentTime = locateTime = beginTime; // = 0;
		if (eos && (delegate != null)) {
			delegate.samplePlayerDidEndSong(url);
		}
	}

	public boolean open(String url) {
		close();
		reader = new MediaFileReader();
		if (reader.open(url)) {
			this.url = url;
			MediaFormat format = reader.getFileFormat();
			totalTime = format.getLong(MediaFormat.KEY_DURATION) / 1000000f;
			sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE);
			channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
			bytesPerFrame = (Short.BYTES * channels);
			format.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_16BIT);
			init(format);
			if (startAudioTrack()) {
				return true;
			}
		}
		reader = null;
		return false;
	}

	public void play() {
		if (playing && paused) {
			paused = false;
			return;
		}
		count = repeat;
		trigger = true;
	}

	public void pause() {
		if (playing && !paused) {
			paused = true;
			trigger = true;
		}
	}

	public void stop(boolean immediate) {
		if (!ready() || (playing && paused)) {
			stopped();
			return;
		}
		if (playing) {
			if (fadeOutStartFrame != 0) {
				this.immediate = true;
			} else {
				fadeOutStartFrame = currentFrame;
				this.immediate = immediate;
			}
		}
	}

	public void locate(float time) {
		if (time < beginTime) {
			time = beginTime;
		}
		if (time > (totalTime - endTime)) {
			time = (totalTime - endTime);
		}
		boolean _playing = (playing && !paused);
		if (_playing) {
			pause();
			try {
				Thread.sleep(100);
			} catch (InterruptedException e) { }
		}
		if (seek(time)) {
			reset();
		}
		if (_playing) {
			play();
		}
	}

	public void begin(float time) {
		if (time > (totalTime - endTime)) {
			time = (totalTime - endTime);
		}
		boolean _playing = (playing && !paused);
		if (_playing) {
			pause();
			try {
				Thread.sleep(100);
			} catch (InterruptedException e) { }
		}
		if (seek(time)) {
			beginTime = time;
			reset();
		}
		if (_playing) {
			play();
		}
	}
	public float begin() {
		return beginTime;
	}

	public void end(float time) {
		if (time >= 0) {
			endTime = time;
			if ((totalTime - endTime) < beginTime) {
				endTime = (totalTime - beginTime);
			}
			if ((totalTime - endTime) < currentTime) {
				begin(beginTime);
			}
		}
	}
	public float end() {
		return endTime;
	}

	public String file() {
		return url;
	}

	public float currentTime() {
		return currentTime;
	}

	public float totalTime() {
		return totalTime;
	}

	public void volume(float gain) {
		if (0 <= gain && gain <= 1.0f) {
			this.gain = gain;
		}
	}
	public float volume() {
		return gain;
	}

	public void repeat(int count) {
		if (count >= -1) {
			this.repeat = this.count = count;
		}
	}
	public int repeat() {
		return repeat;
	}

	public void speed(float rate) {
		this.rate = rate;
	}
	public float speed() {
		return rate;
	}

	public void pitch(float cent) {
		this.cent = cent;
	}
	public float pitch() {
		return cent;
	}

	public void fadeIn(float time) {
		if (time >= 0) {
			this.fadeIn = time;
		}
	}
	public float fadeIn() {
		return fadeIn;
	}

	public void fadeOut(float time) {
		if (time >= 0) {
			this.fadeOut = time;
		}
	}
	public float fadeOut() {
		return fadeOut;
	}

	public String control(String params) {
		return "";
	}

	public int state() {
		if (playing) {
			return (paused ? kSamplePlayerStatePause :
				((fadeOutStartFrame != 0) ? kSamplePlayerStateStopping : kSamplePlayerStatePlay));
		}
		return kSamplePlayerStateStop;
	}

	private boolean seek(float time) {
		if (reader != null) {
			if (reader.seekTo(time)) {
				sampleBuffer = null;
				currentTime = locateTime = time;
				return true;
			}
		}
		return false;
	}

	protected int read(byte[] buffer, int offset, int length) {
		int bytes = 0;
		while (length > 0) {
			if (sampleBuffer != null) {
				int n = sampleBuffer.length - bufpos;
				if (n > length) { n = length; }
				System.arraycopy(sampleBuffer, bufpos, buffer, offset + bytes, n);
				bytes += n; length -= n; bufpos += n;
				if (bufpos == sampleBuffer.length) {
					sampleBuffer = null;
				}
				continue;
			}
			sampleBuffer = reader.readPCM16();
			if (sampleBuffer == null) {
				if (count == 0) {
					break;
				}
				count--;
				if (!seek(beginTime)) { return -1; }
				continue;
			}
			bufpos = 0;
		}
		return bytes;
	}

	protected void init(MediaFormat format) { }
	protected void setPlaybackParams(float rate, float cent) { }
	protected void term() { }
	protected void reset() { }
	protected boolean ready() { return true; }

	protected int render(byte[] buffer, int offset, int length) {
		return 0;
	}

	private int process(byte[] buffer, int length) {
		int offset = 0, bytes = 0;
		bos = false;
		if (trigger) {
			trigger = false;
			if (playing) {
				if (ready()) {
					int len = (length / 2) & ~0x1;
					int n = render(buffer, offset, len);
					if (n <= 0) { stopped(true); return 0; }
					if (paused) { return n; }
					envelope(buffer, offset, n, 1.0f, 0.0f);
					offset += n; length -= n; bytes += n;
				} else if (paused) {
					return 0;
				}
			} else if (locateTime == 0) {
				bos = true;
			}
			playing = true;
			paused = false;
			currentFrame = 0;
			fadeOutStartFrame = 0;
			seek(locateTime);
			reset();
		} else if (ready() && (endTime > 0) && playing && !paused) {
			if (currentTime >= (totalTime - endTime)) {
				int len = (length / 2) & ~0x1;
				int n = render(buffer, offset, len);
				if (n <= 0) { stopped(true); return 0; }
				if (count == 0) { stopped(true); return n; }
				envelope(buffer, offset, n, 1.0f, 0.0f);
				offset += n; length -= n; bytes += n;
				if (count > 0) count--;
				seek(beginTime);
				reset();
			}
		}
		if (ready() && playing && !paused) {
			int n = render(buffer, offset, length);
			if (n <= 0) { stopped(true); return bytes; }
			if (bytes > 0) {
				envelope(buffer, offset, n, 0.0f, 1.0f);
			}
			bytes += n;
		}
		return bytes;
	}

	private float fader() {
		if (!playing || paused) {
			return 0.0f;
		}

		float v = gain;
		float fadeInFrames = fadeIn * sampleRate;
		if (fadeOutStartFrame > 0) {
			float _fadeOut = (immediate || (fadeOut == 0)) ? 0.005f : fadeOut;
			float fadeOutFrames = _fadeOut * sampleRate;
			float endFrame = fadeOutStartFrame + fadeOutFrames;
			v = gain * ((endFrame - currentFrame) / fadeOutFrames);
			if ((fadeInFrames > 0) && (fadeOutStartFrame < fadeInFrames)) {
				v *= fadeOutStartFrame  / fadeInFrames;
			}
			if (currentFrame >= endFrame) {
				stopped();
			}
		} else if ((fadeInFrames > 0) && (currentFrame < fadeInFrames)) {
			v = gain * (currentFrame / fadeInFrames);
		} else if (bos) {
			__gain = AudioVolume.convert(v);
		}
		return AudioVolume.convert(v);
	}

	private float envelope(byte[] buffer, int offset, int length, float coef0, float coef1) {
		if (length <= 0) {
			return coef1;
		}
		float diff = coef1 - coef0;
		if ((diff == 0.0f) && (coef0 <= 0.0f)) {
			Arrays.fill(buffer, offset, offset + length, (byte)0);
			return 0.0f;
		}

		int frames = length / bytesPerFrame;
		float step = diff / frames;
		ByteBuffer bb = ByteBuffer.wrap(buffer).order(ByteOrder.nativeOrder());
		for (int i = offset; frames-- > 0; ) {
			for (int ch = 0; ch < channels; ch++, i += Short.BYTES) {
				float v = bb.getShort(i) * coef0;
				bb.putShort(i, (short)v);
				power.set(ch, v);
			}
			coef0 += step;
		}
		return coef1;
	}

	private int renderCallBack(byte[] buffer, int length) {
		int n = process(buffer, length);
		int frames = n / bytesPerFrame;
		currentFrame += frames;
		__gain = envelope(buffer, 0, n, __gain, fader());
		if (ENABLE_PLAYBACKPARAMS) {
			currentTime += ((float)frames / sampleRate);
		} else {
			currentTime += ((rate * frames) / sampleRate);
		}
		power.update(length / bytesPerFrame);
		return n;
	}

	private boolean startAudioTrack() {

		closeAudioTrack();

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
		audioBuffer = new byte[minBufferSize * kNumOfAudioBuffers];
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
					audioBuffer.length,
					AudioTrack.MODE_STREAM,
					AudioManager.AUDIO_SESSION_ID_GENERATE);
		} else {
			audioTrack = new AudioTrack(
					AudioManager.STREAM_MUSIC,
					sampleRate,
					channelConfig,
					AudioFormat.ENCODING_PCM_16BIT,
					audioBuffer.length,
					AudioTrack.MODE_STREAM);
		}

		setPlaybackParams(rate, cent);

		power.config(sampleRate);

		renderThread = new HandlerThread("SamplePlayerRenderThread");
		renderThread.start();

		audioTrack.setPositionNotificationPeriod(minBufferSize / bytesPerFrame);
		audioTrack.setPlaybackPositionUpdateListener(new AudioTrack.OnPlaybackPositionUpdateListener() {
			@Override
			public void onPeriodicNotification(AudioTrack audioTrack) {
				if (audioBuffer != null) {
					int len = renderCallBack(audioBuffer, minBufferSize);
					Arrays.fill(audioBuffer, len, minBufferSize, (byte) 0);
					if (audioTrack.write(audioBuffer, 0, minBufferSize) < 0) {
						closeAudioTrack();
					}
				}
			}
			@Override
			public void onMarkerReached(AudioTrack audioTrack) {
				/* nothing to do */
			}
		}, new Handler(renderThread.getLooper()));

		trigger = false;

		Arrays.fill(audioBuffer, 0, audioBuffer.length, (byte)0);
		if (audioTrack.write(audioBuffer, 0, audioBuffer.length) < 0) {
			return false;
		}
		audioTrack.play();
		return true;
	}

	public float[] peakPowerForChannels() {
		float[] array = new float[power.channels()];
		for (int ch = 0; ch < power.channels(); ch++) {
			float peakPower = -120.0f;
			float x = power.get(ch) / 32768.0f;
			if (x != 0) {
				x = (float)(20 * Math.log10(x));
				if (x > peakPower)
					peakPower = x;
			}
			array[ch] = peakPower;
		}
		return array;
	}

}

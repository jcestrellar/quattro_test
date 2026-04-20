//
//	AudioVolume.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import java.util.Arrays;

public class AudioVolume {

	public static float convert(float gain) {
		if (gain <= 0.0f) return 0.0f;
		if (gain >= 1.0f) return 1.0f;
		return (float) Math.pow(gain, 1.75f);
	}

	public static class RMSAvaragePower {

		private static final int kNumOfChannels = 2;

		private int maxpos = 0;
		private int curpos = 0;
		private int[] bufFrames = null;
		private float[] bufValues = null;

		private boolean reset = false;
		private float sampleRate = 44100.0f;
		private final int[] frames = new int[kNumOfChannels];
		private final float[] values = new float[kNumOfChannels];
		private final float[] lastValues = new float[kNumOfChannels];

		RMSAvaragePower(int bufNum) {
			maxpos = (bufNum > 0) ? bufNum : 1;
			bufFrames = new int[maxpos * kNumOfChannels];
			bufValues = new float[maxpos * kNumOfChannels];
			clear();
		}

		public void clear() {
			curpos = 0;
			Arrays.fill(bufFrames, 0);
			Arrays.fill(bufValues, 0.0f);
			for (int channel = 0; channel < kNumOfChannels; channel++) {
				frames[channel] = 0;
				values[channel] = 0.0f;
				lastValues[channel] = 0.0f;
			}
		}

		public int channels() {
			return kNumOfChannels;
		}

		public void config(float sampleRate) {
			if (sampleRate > 0) {
				clear();
				this.sampleRate = sampleRate;
			}
		}

		public void set(int channel, float value) {
			if (channel < kNumOfChannels) {
				bufValues[(maxpos * channel) + curpos] += (value * value);
			}
		}

		void update(int _frames) {
			for (int channel = 0; channel < kNumOfChannels; channel++) {
				bufFrames[(maxpos * channel) + curpos] = _frames;
			}
			if (++curpos >= maxpos) {
				curpos = 0;
			}
			for (int channel = 0; channel < kNumOfChannels; channel++) {
				if (reset) { frames[channel] = 0; values[channel] = 0.0f; }
				frames[channel] += bufFrames[(maxpos * channel) + curpos];
				values[channel] += bufValues[(maxpos * channel) + curpos];
				bufFrames[(maxpos * channel) + curpos] = 0;
				bufValues[(maxpos * channel) + curpos] = 0.0f;
			}
			reset = false;
		}

		float get(int channel) {
			float avaragePower = 0.0f;
			if (channel < kNumOfChannels) {
				if (frames[channel] > 0) {
					avaragePower = (float)Math.sqrt(values[channel] / frames[channel]);
					if (avaragePower < lastValues[channel]) {
						float coef = (float)(1 - Math.exp((frames[channel] / sampleRate) * (-6)));
						lastValues[channel] += ((avaragePower - lastValues[channel]) * coef);
						avaragePower = Math.max(0.0f, lastValues[channel]);
					} else {
						lastValues[channel] = avaragePower;
					}
					reset = true;
				}
			}
			return avaragePower;
		}

	}

}

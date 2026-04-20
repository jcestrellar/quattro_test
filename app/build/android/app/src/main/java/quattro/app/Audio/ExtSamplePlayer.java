//
//	ExtSamplePlayer.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.app.Audio;

import android.content.Context;
import android.media.MediaFormat;
import android.media.PlaybackParams;

import quattro.Audio.*;

public class ExtSamplePlayer extends SamplePlayer {

	public ExtSamplePlayer(Context c) { super(c); }

	@Override
	public void setPlaybackParams(float rate, float cent) {
		PlaybackParams playbackParams = audioTrack.getPlaybackParams();
		float pitch = (float)Math.pow(2, (cent / 1200));
		playbackParams.setSpeed(rate);
		playbackParams.setPitch(pitch);
		audioTrack.setPlaybackParams(playbackParams);
	}

	@Override
	public void speed(float rate) {
		if (0.5f <= rate && rate <= 2.0f) {
			super.speed(rate);
			if (audioTrack != null) {
				audioTrack.setPlaybackParams(audioTrack.getPlaybackParams().setSpeed(rate));
			}
		}
	}

	@Override
	public void pitch(float cent) {
		if (-2400 <= cent && cent <= 2400) {
			super.pitch(cent);
			if (audioTrack != null) {
				float pitch = (float)Math.pow(2, (cent / 1200));
				audioTrack.setPlaybackParams(audioTrack.getPlaybackParams().setPitch(pitch));
			}
		}
	}

	@Override
	protected void init(MediaFormat format) { }

	@Override
	protected void term() { }

	@Override
	protected void reset() { }

	@Override
	protected int render(byte[] buffer, int offset, int length) {
		return read(buffer, offset, length);
	}

}

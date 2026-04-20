//
//	AudioPlayer.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import java.io.IOException;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.media.audiofx.Visualizer;
import android.net.Uri;
import android.os.Build;

public class AudioPlayer {

	private static final int kNumOfChannels = 2;
	
	public static final int kAudioOutputStatusStop  = 0;
	public static final int kAudioOutputStatusStart = 1;
	public static final int kAudioOutputStatusPause = 2;

	public AudioPlayerDelegate delegate = null;
	
	private MediaPlayer player = null;
	private Visualizer visualizer = null;
//	private MeasurementPeakRms measurement = new MeasurementPeakRms();

	protected Context applicationContext;

	private String url = null;
	private float gain = 1.0f;
	private float rate = 1.0f;
	private float cent = 0.0f;
	private boolean started = false;

	public AudioPlayer(Context c) {
		applicationContext = c;
	}

	private String getURL() {
		return url;
	}
	
	private boolean prepare() {

		player = new MediaPlayer();

		player.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
			@Override
		    public void onCompletion(MediaPlayer mediaPlayer) {
				if (delegate != null) {
					delegate.audioPlayerDidEndSong(getURL());
					delegate.audioPlayerDidFinishPlaying(getURL());
				}
		    }
		});

		player.setOnErrorListener(new MediaPlayer.OnErrorListener() {
			@Override
			public boolean onError(MediaPlayer mediaPlayer, int what, int extra) {
				String url = getURL();
				release();
				if (url != null && delegate != null) {
					delegate.audioPlayerErrorDidOccur(url);
				}
				return true;
	        }
		});

		String error = null;
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
			player.setAudioAttributes(new AudioAttributes.Builder()
					.setLegacyStreamType(AudioManager.STREAM_MUSIC)
					.setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
					.setUsage(AudioAttributes.USAGE_MEDIA)
					.build());
		} else {
 			player.setAudioStreamType(AudioManager.STREAM_MUSIC);
		}
		try {
			if (url.startsWith("android.resource://")) {
				player.setDataSource(applicationContext, Uri.parse(url));
			} else {
				player.setDataSource(url);
			}
			player.prepare();
		} catch (IllegalArgumentException e) {
			error = e.getLocalizedMessage();
		} catch (SecurityException e) {
			error = e.getLocalizedMessage();
		} catch (IllegalStateException e) {
			error = e.getLocalizedMessage();
		} catch (IOException e) {
			error = e.getLocalizedMessage();
		}
		if (error != null) {
			release();
			url = null;
			return false;
		}

//		visualizer = new Visualizer(player.getAudioSessionId());
//		visualizer.setMeasurementMode(Visualizer.MEASUREMENT_MODE_PEAK_RMS);
//		visualizer.setEnabled(true);

	    return true;
	}

	public boolean open(String url) {
		release();
		this.url = url;
		return prepare();
	}

	public void play() {
		if (player != null) {
			player.start();
			PlaybackParams playbackParams = player.getPlaybackParams();
			float pitch = (float)Math.pow(2, (cent / 1200));
			playbackParams.setSpeed(rate);
			playbackParams.setPitch(pitch);
			player.setPlaybackParams(playbackParams);
			started = true;
		}
	}

	public void pause() {
		if (player != null) {
			player.pause();
		}
	}

	public void stop() {
		release();
		if (url != null) {
			prepare();
			if (delegate != null) {
				delegate.audioPlayerDidFinishPlaying(url);
			}
		}
	}

	public void locate(float time) {
		stop();
		if (player != null) {
			player.seekTo((int)(time * 1000f));
		}
	}

	public void volume(float vol) {
		if (0 <= vol && vol <= 1.0) {
			gain = vol;
			if (player != null) {
				player.setVolume(gain, gain);
			}
		}
	}

	public float volume() {
		return gain;
	}

	public void speed(float rate) {
		if (0.5f <= rate && rate <= 2.0f) {
			this.rate = rate;
			if ((player != null) && player.isPlaying()) {
				player.setPlaybackParams(player.getPlaybackParams().setSpeed(rate));
			}
		}
	}

	public float speed() {
		return rate;
	}

	public void pitch(float cent) {
		if (-2400 <= cent && cent <= 2400) {
			this.cent = cent;
			if ((player != null) && player.isPlaying()) {
				float pitch = (float)Math.pow(2, (cent / 1200));
				player.setPlaybackParams(player.getPlaybackParams().setPitch(pitch));
			}
		}
	}

	public float pitch() {
		return cent;
	}

	public String file() {
		return getURL();
	}

	public int status() {
		if (started) {
			return player.isPlaying() ? kAudioOutputStatusStart : kAudioOutputStatusPause;
		}
		return kAudioOutputStatusStop;
	}

	public float currentTime() {
		return (player != null) ? player.getCurrentPosition() / 1000f : 0f;
	}

	public float totalTime() {
		return (player != null) ? player.getDuration() / 1000f : 0f;
	}

	public int numberOfChannels() {
		return kNumOfChannels;
	}

	public float peakPowerForChannel(int channel) {
		if (visualizer != null) {
//			visualizer.getMeasurementPeakRms(measurement);
//			return measurement.mRms / 100;
		}
		return -120.0f;
	}

	public void output(boolean network) {
		/* not implemented yet. */
	}

	public void destroy() {
		release();
//		measurement = null;
		delegate = null;
		applicationContext = null;
	}

	private void release() {
		if (player != null) {
			player.stop();
			player.reset();
			player.release();
			player = null;
		}
		if (visualizer != null) {
			visualizer.release();
			visualizer = null;
		}
		started = false;
	}

}

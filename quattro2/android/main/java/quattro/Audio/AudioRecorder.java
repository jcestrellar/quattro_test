//
//	AudioRecorder.java
//
//	Copyright 2015 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import java.io.IOException;

import android.content.Context;
import android.media.MediaRecorder;

public class AudioRecorder
{
	private static final int kNumOfChannels = 1;
	
	public static final int kRecordingFormatAAC_256K = 0;
	public static final int kRecordingFormatAAC_192K = 1;
	public static final int kRecordingFormatAAC_128K = 2;
	public static final int kRecordingFormatAAC_64K  = 3;
	public static final int kRecordingFormatWAV      = 4;

	public static final int kAudioInputStatusStop  = 0;
	public static final int kAudioInputStatusStart = 1;
	public static final int kAudioInputStatusPause = 2;

	public AudioRecorderDelegate delegate = null;

	private MediaRecorder recorder = null;

	protected Context applicationContext;

	private String url = null;
	private float gain = 1.0f;
	private boolean started = false;
	private long t0 = 0;

	public AudioRecorder(Context c) {
		applicationContext = c;
	}

	private String getURL() {
		return url;
	}
	
	public boolean create(String url, int format) {

		release();

		this.url = url;

		recorder = new MediaRecorder();
		recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
		recorder.setAudioChannels(kNumOfChannels);

		switch (format) {
			case kRecordingFormatAAC_256K:
				recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
				recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
				recorder.setAudioEncodingBitRate(256000);
				break;
			case kRecordingFormatAAC_192K:
				recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
				recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
				recorder.setAudioSamplingRate(192000);
				break;
			case kRecordingFormatAAC_128K:
				recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
				recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
				recorder.setAudioSamplingRate(128000);
				break;
			case kRecordingFormatAAC_64K:
				recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
				recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
				recorder.setAudioSamplingRate(64000);
				break;
			case kRecordingFormatWAV:
				recorder.setOutputFormat(MediaRecorder.OutputFormat.DEFAULT);
				recorder.setAudioEncoder(MediaRecorder.AudioEncoder.DEFAULT);
				break;
			default:
				break;
		}

		recorder.setOutputFile(url);
		recorder.setOnErrorListener(new MediaRecorder.OnErrorListener() {
			@Override
			public void onError(MediaRecorder mr, int what, int extra) {
	            release();
	            switch (what) {
	            	case MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED:
	            	case MediaRecorder.MEDIA_RECORDER_INFO_MAX_FILESIZE_REACHED:
	    				if ((getURL() != null) && (delegate != null)) {
	            			delegate.audioRecorderDidFinishRecording(getURL());
	            		}
	    				break;
	            	default:
	    				if ((getURL() != null) && (delegate != null)) {
	    					delegate.audioRecorderErrorDidOccur(getURL());
	    				}
	    				break;
	            }
		    }
		});

		String error = null;
		try {
			recorder.prepare();
		} catch (IllegalStateException e) {
			error = e.getLocalizedMessage();
		} catch (IOException e) {
			error = e.getLocalizedMessage();
		}
		if (error != null) {
			this.url = null;
			release();
			return false;
		}
		
		return true;
	}

	public void record() {
		if (recorder != null) {
			if (!started) {
				recorder.start();
				started = true;
				t0 = System.currentTimeMillis();
			}
		}
	}

	public void pause() {
		/* android does not support 'pause' */
	}

	public void stop(boolean shouldStopImmediate) {
		started = false;
		release();
		if ((url != null) && (delegate != null)) {
			delegate.audioRecorderDidFinishRecording(url);
		}
	}

	public void volume(float vol) {
		if (0 <= vol && vol <= 1.0) {
			/* android does not support recording volume control */
		}
	}

	public float volume() {
		return gain;
	}

	public String file() {
		return ((recorder != null) ? url : null);
	}

	public int status() {
		return started ? kAudioInputStatusStart : kAudioInputStatusStop;
	}

	public float currentTime() {
		return (recorder != null) ? ((System.currentTimeMillis() - t0) / 1000f) : 0f;
	}

	public int numberOfChannels() {
		return kNumOfChannels;
	}

	public float peakPowerForChannel(int channel) {
		if (started) {
			return (float) (20 * Math.log10(recorder.getMaxAmplitude() / 32768.0));
		}
		return -120.0f;
	}

	public void input(boolean b) {
		/* not implemented yet. */
	}

	public void destroy() {
		release();
		delegate = null;
		applicationContext = null;
	}

	private void release() {
		if (recorder != null) {
			recorder.stop();
			recorder.reset();
			recorder.release();
			recorder = null;
		}
	}

}

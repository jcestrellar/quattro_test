//
//	AudioConverter.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Audio.*;

import android.media.AudioFormat;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class AudioToolbox extends JavaScriptObject
{
	private final String interfaceName = "audio";

	public String getInterfaceName() {
		return interfaceName;
	}

	public static final String AudioConverterOutputFileKey = "file";
	public static final String AudioConverterFormatKey     = "format";
	public static final String AudioConverterChannelsKey   = "channels";
	public static final String AudioConverterSampleRateKey = "samplerate";
	public static final String AudioConverterBitDepthKey   = "bitdepth";
	public static final String AudioConverterBitRateKey    = "bitrate";
	public static final String AudioConverterDurationKey   = "duration";

	public AudioToolbox(JavaScriptHandler h) {
		super(h);
	}

	@JavascriptInterface
	public String inputs() {
		return "[]"; /* Not supported */
	}

	@JavascriptInterface
	public String outputs() {
		return "[]"; /* Not supported */
	}

	@JavascriptInterface
	public String format(String file) {
		MediaFormat fileFormat = AudioConverter.format(file);

		String mime    = (fileFormat != null) ? fileFormat.getString(MediaFormat.KEY_MIME) : "error";
		int sampleRate = (fileFormat != null) ? fileFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE) : 0;
		int channels   = (fileFormat != null) ? fileFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT) : 0;
		int bitrate    = (fileFormat != null) ? fileFormat.getInteger(MediaFormat.KEY_BIT_RATE) : 0;
		long duration  = (fileFormat != null) ? fileFormat.getLong(MediaFormat.KEY_DURATION) : 0;

		String formatTag;
		int bitsPerSample = 0;
		if (mime.equals(WavFileHeader.MIMETYPE_AUDIO_WAV)) {
			formatTag = "PCM";
			int encoding = fileFormat.getInteger(MediaFormat.KEY_PCM_ENCODING);
			switch (encoding) {
				case AudioFormat.ENCODING_PCM_8BIT:
					bitsPerSample = 8;
					break;
				case AudioFormat.ENCODING_PCM_16BIT:
					bitsPerSample = 16;
					break;
				case AudioFormat.ENCODING_PCM_24BIT_PACKED:
					bitsPerSample = 24;
					break;
				case AudioFormat.ENCODING_PCM_32BIT:
					bitsPerSample = 32;
					break;
				case AudioFormat.ENCODING_PCM_FLOAT:
					bitsPerSample = 0;
					break;
			}
		} else if (mime.equals(MediaFormat.MIMETYPE_AUDIO_AAC)) {
			formatTag = "AAC";
		} else {
			formatTag = mime;
		}

		JSONObject obj = new JSONObject();
		try {
			obj.put(AudioConverterFormatKey, formatTag);
			obj.put(AudioConverterChannelsKey, Integer.valueOf(channels));
			obj.put(AudioConverterSampleRateKey, Integer.valueOf(sampleRate));
			obj.put(AudioConverterBitDepthKey, Integer.valueOf(bitsPerSample));
			obj.put(AudioConverterBitRateKey, Integer.valueOf(bitrate));
			obj.put(AudioConverterDurationKey, Float.valueOf(duration / 1000000.f));
		} catch (JSONException e) {}
		return obj.toString();
	}

	@JavascriptInterface
	public void convert(String in, String json) {
		try {
			JSONObject root = new JSONObject(json);
			String out = root.getString(AudioConverterOutputFileKey);
			String format = root.getString(AudioConverterFormatKey);
			int channels = (int)root.getLong(AudioConverterChannelsKey);
			int sampleRate = (int)root.getLong(AudioConverterSampleRateKey);
			int bitsPerSample = (int)root.getLong(AudioConverterBitDepthKey);
			int bitrate = (int)root.getLong(AudioConverterBitRateKey);

			MediaFormat outputFormat;
			if (format.equals("wav")) {
				outputFormat= MediaFormat.createAudioFormat(
						WavFileHeader.MIMETYPE_AUDIO_WAV, sampleRate, channels);
				switch (bitsPerSample) {
					case  0: outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_FLOAT); break;
					case  8: outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_8BIT ); break;
					case 16: outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_16BIT); break;
					case 24: outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_24BIT_PACKED); break;
					case 32: outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_32BIT); break;
					default:
						postEvent(getInterfaceName() + "\f" + "convertfailed" + "\f" + in);
						return;
				}
			} else if (format.equals("m4a")) {
				outputFormat= MediaFormat.createAudioFormat(
						MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels);
				outputFormat.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
				outputFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
			} else {
				throw new Exception();
			}

			(new Thread() {
				@Override
				public void run() {
					try {
						if (AudioConverter.convert(in, out, outputFormat)) {
							JSONArray array = new JSONArray();
							array.put(out);
							postEvent(getInterfaceName() + "\f" + "converted" + "\f" + in + "\f" + array.toString());
							return;
						}
					} catch (Exception e) { }
					postEvent(getInterfaceName() + "\f" + "convertfailed" + "\f" + in);
				}
			}).start();
		} catch (Exception e) {
			postEvent(getInterfaceName() + "\f" + "convertfailed" + "\f" + in);
		}
	}

	@JavascriptInterface
	public void split(String file, String json) {
		try {
			JSONArray array = new JSONArray(json);
			String[] wavs = new String[array.length()];
			for (int i = 0; i < array.length(); i++) {
				wavs[i] = array.getString(i);
			}
			(new Thread() {
				@Override
				public void run() {
					try {
						boolean success = AudioConverter.split(file, wavs);
						if (success) {
							postEvent(getInterfaceName() + "\f" + "converted" + "\f" + file + "\f" + json);
							return;
						}
					} catch (Exception e) {}
					postEvent(getInterfaceName() + "\f" + "convertfailed" + "\f" + file);
				}
			}).start();
		} catch (Exception e) {
			postEvent(getInterfaceName() + "\f" + "convertfailed" + "\f" + file);
		}
	}

	@JavascriptInterface
	public void reverse(String file, String wav) {
		(new Thread() {
			@Override
			public void run() {
				try {
					if (AudioConverter.reverse(file, wav)) {
						JSONArray array = new JSONArray();
						array.put(wav);
						postEvent(getInterfaceName() + "\f" + "converted" + "\f" + file + "\f" + array.toString());
						return;
					}
				} catch (Exception e) { }
				postEvent(getInterfaceName() + "\f" + "convertfailed" + "\f" + file);
			}
		}).start();
	}

	@Override
	public void onDestroy() {
	}

}

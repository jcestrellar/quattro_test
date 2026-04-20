//
//	AudioConverter.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.media.AudioFormat;
import android.media.MediaFormat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

public class AudioConverter {

	public static MediaFormat format(String file) {
		MediaFormat fileFormat = null;
		MediaFileReader reader = new MediaFileReader();
		if (reader.open(file)) {
			fileFormat = reader.getFileFormat();
			reader.close();
		}
		return fileFormat;
	}

	public static boolean convert(String in, String out, MediaFormat outputFormat) {

		MediaFileReader reader = new MediaFileReader();
		if (!reader.open(in)) {
			return false;
		}

		MediaFileWriter writer = new MediaFileWriter();
		if (!writer.open(out, outputFormat)) {
			reader.close();
			return false;
		}

		MediaFormat inputFormat = reader.getFileFormat();
		int inSampleRate = inputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
		int inChannels = inputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
		int outSampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
		int outChannels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);

		boolean success = true;

		float mixfactor = 1.0f;
		if ((inChannels > 1) && (inChannels != outChannels)) {
			/* calculate the amplitude factor for mixdown */
			float inMax = 0, mixMax = 0;
			SampleRateConverter SRC = new SampleRateConverter(inSampleRate, outSampleRate);
			while (true) {
				byte[] pcm = reader.readPCMFloat();
				pcm = SRC.convert(pcm, inChannels);
				if (pcm == null) {
					break;
				}
				int frames = pcm.length / (Float.BYTES * inChannels);
				ByteBuffer bb = ByteBuffer.wrap(pcm).order(ByteOrder.nativeOrder());
				while (frames-- > 0) {
					float mix = 0;
					for (int ch = inChannels; ch > 0; ch--) {
						float f = bb.getFloat();
						if (inMax < Math.abs(f)) { inMax = Math.abs(f); }
						mix += f;
					}
					if (mixMax < Math.abs(mix)) { mixMax = Math.abs(mix); }
				}
			}
			mixfactor = (mixMax <= inMax) ? 1.0f : (inMax / mixMax);
			success = reader.seekTo(0);
		}

		SampleRateConverter SRC = new SampleRateConverter(inSampleRate, outSampleRate);
		while (success) {
			byte[] pcm = reader.readPCMFloat();
			pcm = SRC.convert(pcm, inChannels);
			if (pcm == null) {
				break;
			}
			if (inChannels != outChannels) {
				if (inChannels > 1) {
					int frames = pcm.length / (Float.BYTES * inChannels);
					ByteBuffer bb1 = ByteBuffer.wrap(pcm).order(ByteOrder.nativeOrder());
					ByteBuffer bb2 = ByteBuffer.allocate(frames * Float.BYTES).order(ByteOrder.nativeOrder());
					while (frames-- > 0) {
						float mix = 0;
						for (int ch = inChannels; ch > 0; ch--) {
							float f = bb1.getFloat();
							mix += f;
						}
						bb2.putFloat(mix * mixfactor);
					}
					pcm = bb2.array();
				}
				if (outChannels > 1) {
					int frames = pcm.length / Float.BYTES;
					ByteBuffer bb1 = ByteBuffer.wrap(pcm).order(ByteOrder.nativeOrder());
					ByteBuffer bb2 = ByteBuffer.allocate(frames * (Float.BYTES * outChannels)).order(ByteOrder.nativeOrder());
					while (frames-- > 0) {
						float f = bb1.getFloat();
						for (int ch = outChannels; ch > 0; ch--) {
							bb2.putFloat(f);
						}
					}
					pcm = bb2.array();
				}
			}
			success = writer.writePCMFloat(pcm);
		}

		reader.close();
		writer.close();

		return success;
	}

	public static boolean split(String in, String[] outs) {

		MediaFileReader reader = new MediaFileReader();
		if (!reader.open(in)) {
			return false;
		}
		MediaFormat fileFormat = reader.getFileFormat();
		String mime = fileFormat.getString(MediaFormat.KEY_MIME);
		int sampleRate = fileFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
		int inChannels = fileFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
		int outChannels = (outs.length > 0) ? Math.min(inChannels / outs.length, 2) : 0;
		if (outChannels == 0) {
			return false;
		}

		MediaFormat outputFormat = MediaFormat.createAudioFormat(
				WavFileHeader.MIMETYPE_AUDIO_WAV, sampleRate, outChannels);
		if (mime.equals(WavFileHeader.MIMETYPE_AUDIO_WAV)) {
			int encoding = fileFormat.getInteger(MediaFormat.KEY_PCM_ENCODING);
			outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, encoding);
		} else {
			outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_16BIT);
		}

		boolean success = true;

		MediaFileWriter[] writers = new MediaFileWriter[outs.length];
		Arrays.fill(writers, null);
		for (int n = 0; n < outs.length && success; n++) {
			writers[n] = new MediaFileWriter();
			success = writers[n].open(outs[n], outputFormat);
		}

		while (success) {
			byte[] pcm = reader.readPCMFloat();
			if (pcm == null) {
				break;
			}
			int block = (Float.BYTES * inChannels);
			int frames = pcm.length / block;
			ByteBuffer inputBuffer = ByteBuffer.wrap(pcm).order(ByteOrder.nativeOrder());
			for (int n = 0, ch = 0; n < outs.length; n++, ch += outChannels) {
				ByteBuffer outputBuffer = ByteBuffer.allocate(frames * Float.BYTES * outChannels).order(ByteOrder.nativeOrder());
				for (int cnt = frames, offset = ch * Float.BYTES; cnt > 0; cnt--, offset += block) {
					outputBuffer.put(inputBuffer.array(), offset, Float.BYTES * outChannels);
				}
				if (!writers[n].writePCMFloat(outputBuffer.array())) {
					success = false;
					break;
				}
			}
		}

		reader.close();
		for (int n = 0; n < outs.length; n++) {
			if (writers[n] != null) {
				writers[n].close();
			}
		}

		if (!success) {
			for (int n = 0; n < outs.length; n++) {
				File file = new File(outs[n]);
				file.delete();
			}
		}

		return success;
	}

	public static boolean reverse(String in, String out) {

		MediaFileReader reader = new MediaFileReader();
		if (!reader.open(in)) {
			return false;
		}
		MediaFormat fileFormat = reader.getFileFormat();
		String mime = fileFormat.getString(MediaFormat.KEY_MIME);
		int sampleRate = fileFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
		int channels = fileFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);

		MediaFormat outputFormat= MediaFormat.createAudioFormat(
				WavFileHeader.MIMETYPE_AUDIO_WAV, sampleRate, channels);
		if (mime.equals(WavFileHeader.MIMETYPE_AUDIO_WAV)) {
			int encoding = fileFormat.getInteger(MediaFormat.KEY_PCM_ENCODING);
			outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, encoding);
		} else {
			outputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_16BIT);
		}

		MediaFileWriter writer = new MediaFileWriter();
		if (!writer.open(out, outputFormat)) {
			reader.close();
			return false;
		}

		boolean success = true;

		File tmpFile = null;
		try {
			tmpFile = File.createTempFile("___", null);

			FileOutputStream _out = new FileOutputStream(tmpFile);
			while (true) {
				byte[] pcm = reader.readPCMFloat();
				if (pcm == null) {
					break;
				}
				_out.write(pcm);
			}
			_out.close();

			RandomAccessFile _in = new RandomAccessFile(tmpFile, "r");
			long offset = _in.length();
			int block = (Float.BYTES * channels);
			int size = block * 0x4000;
			byte[] buf1 = new byte[size];
			while (offset > 0) {
				if (offset < size) {
					size = (int)offset;
					offset = 0;
				} else {
					offset -= size;
				}
				_in.seek(offset);
				int len = _in.read(buf1, 0, size);
				if (len != size) {
					success = false;
					break;
				}
				byte[] buf2 = new byte[len];
				for (int i = len - block, j = 0; i >= 0; i -= block, j += block) {
					System.arraycopy(buf1, i, buf2, j, block);
				}
				if (!writer.writePCMFloat(buf2)) {
					success = false;
					break;
				}
			}
			_in.close();

		} catch (IOException e) {
			success = false;
		} finally {
			reader.close();
			writer.close();
			if (tmpFile != null) {
				tmpFile.delete();
			}
		}

		if (!success) {
			File file = new File(out);
			file.delete();
		}

		return success;
	}

}

//
//	MediaFileWriter.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.media.MediaCodec;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.os.Build;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class MediaFileWriter {

	private static final long TIMEOUT_US = 1000;

	private WavFileWriter wavWriter = null;
	private MediaMuxer muxer = null;
	private MediaCodec codec = null;
	private MediaMuxerThread thread = null;

	private double sampleRate = 0;
	private int channels = 0;
	private int currentFrame = 0;

	public boolean open(String url, MediaFormat outputFormat) {
		close();
		try {
			if (outputFormat.getString(MediaFormat.KEY_MIME).equals(WavFileHeader.MIMETYPE_AUDIO_WAV)) {
				wavWriter = new WavFileWriter();
				return wavWriter.open(url, outputFormat);
			} else if (outputFormat.getString(MediaFormat.KEY_MIME).equals(MediaFormat.MIMETYPE_AUDIO_AAC)) {
				sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
				channels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
				currentFrame = 0;

				muxer = new MediaMuxer(url, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
				codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC);
				codec.configure(outputFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
				codec.start();

				thread = new MediaMuxerThread();
				thread.start();
				return true;
			}
		} catch (Exception e) {
			close();
		}
		return false;
	}

	public void close() {
		if (thread != null) {
			eos();
			thread.interrupt();
			try {
				thread.join();
			} catch (InterruptedException e) {}
			thread = null;
		}
		if (codec != null) {
			codec.stop();
			codec.release();
			codec = null;
		}
		if (wavWriter != null) {
			wavWriter.close();
			wavWriter = null;
		}
	}

	private void eos() {
		while (true) {
			int inIndex = codec.dequeueInputBuffer(TIMEOUT_US);
			if (inIndex >= 0) {
				codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
				break;
			}
		}
	}

	public boolean writePCM16(byte[] pcm16) {
		if (wavWriter != null) {
			return wavWriter.writePCM16(pcm16);
		}
		int offset = 0;
		int length = pcm16.length;
		while (length > 0) {
			int inIndex = codec.dequeueInputBuffer(TIMEOUT_US);
			if (inIndex >= 0) {
				ByteBuffer buffer;
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
					buffer = codec.getInputBuffer(inIndex);
				} else {
					buffer = codec.getInputBuffers()[inIndex];
				}
				buffer.clear();
				int len = buffer.limit();
				if (len > length) { len = length; }
				buffer.put(pcm16, offset, len);
				double presentationTimeUs = 1000000L * currentFrame / sampleRate;
				codec.queueInputBuffer(inIndex, 0, len, (long)presentationTimeUs, 0);
				offset += len;
				length -= len;
				currentFrame += (len / (Short.BYTES * channels));
			}
		}
		return true;
	}

	public boolean writePCMFloat(byte[] pcm) {
		if (wavWriter != null) {
			return wavWriter.writePCMFloat(pcm);
		}
		ByteBuffer bb1 = ByteBuffer.wrap(pcm).order(ByteOrder.nativeOrder());
		ByteBuffer bb2 = ByteBuffer.allocate(pcm.length / 2).order(ByteOrder.nativeOrder());
		for (int cnt = pcm.length / Float.BYTES; cnt-- > 0; ) {
			int x = (int)(bb1.getFloat() * 0x8000);
			if (x > Short.MAX_VALUE) { x = Short.MAX_VALUE; }
			if (x < Short.MIN_VALUE) { x = Short.MIN_VALUE; }
			bb2.putShort((short)x);
		}
		return writePCM16(bb2.array());
	}

	private final class MediaMuxerThread extends Thread {

		@Override
		public void run() {

			int trackIndex = 0;

			MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();

			while ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) == 0) {
				int activeIndex = codec.dequeueOutputBuffer(info, TIMEOUT_US);
				switch (activeIndex) {
					case MediaCodec.INFO_OUTPUT_FORMAT_CHANGED:
						MediaFormat format = codec.getOutputFormat();
						trackIndex = muxer.addTrack(format);
						muxer.start();
						break;
					case MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED:
					case MediaCodec.INFO_TRY_AGAIN_LATER:
						break;
					default:
						ByteBuffer buffer;
						if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
							buffer = codec.getOutputBuffer(activeIndex);
						} else {
							buffer = codec.getOutputBuffers()[activeIndex];
						}
						buffer.position(info.offset);
						buffer.limit(info.offset + info.size);
						if ((info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0 && info.size != 0) {
							/* ignore */
						} else {
							muxer.writeSampleData(trackIndex, buffer, info);
						}
						codec.releaseOutputBuffer(activeIndex, false);
						break;
				}
				if (!interrupted() && (activeIndex == MediaCodec.INFO_TRY_AGAIN_LATER)) {
					try {
						sleep(100);
					} catch (InterruptedException e) { }
				}
			}

			muxer.stop();
			muxer.release();
			muxer = null;
		}
	}

}

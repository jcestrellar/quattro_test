//
//	MediaFileReader.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Build;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class MediaFileReader {

	private final static long TIMEOUT_US = 1000;

	private WavFileReader wavReader = null;
	private MediaExtractor extractor = null;
	private MediaCodec codec = null;
	private int trackIndex = 0;

	private MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();

	public boolean open(String url) {
		close();
		try {
			wavReader = new WavFileReader();
			if (wavReader.open(url)) {
				return true;
			} else {
				wavReader = null;
			}
			extractor = new MediaExtractor();
			extractor.setDataSource(url);
			int numOfTrack = extractor.getTrackCount();
			for (int track = 0; track < numOfTrack; track++) {
				MediaFormat format = extractor.getTrackFormat(track);
				String mime = format.getString(MediaFormat.KEY_MIME);
				if (mime.startsWith("audio")) {
					trackIndex = track;
					codec = MediaCodec.createDecoderByType(mime);
					codec.configure(format, null, null, 0);
					extractor.selectTrack(track);
					codec.start();
					return true;
				}
			}
		} catch (IOException e) {
			close();
		}
		return false;
	}

	public void close() {
		if (codec != null) {
			codec.stop();
			codec.release();
			codec = null;
		}
		if (extractor != null) {
			extractor.release();
			extractor = null;
		}
		if (wavReader != null) {
			wavReader.close();
			wavReader = null;
		}
	}

	public MediaFormat getFileFormat() {
		if (wavReader != null) {
			return wavReader.getFileFormat();
		} else if (extractor != null) {
			return extractor.getTrackFormat(trackIndex);
		}
		return null;
	}

	public long getSampleTime () {
		if (wavReader != null) {
			return wavReader.getSampleTime();
		} else if (extractor != null) {
			return extractor.getSampleTime();
		}
		return 0;
	}

	public byte[] readPCM16() {
		if (wavReader != null) {
			return wavReader.readPCM16();
		}
		while (true) {
			int inIndex = codec.dequeueInputBuffer(0);
			if (inIndex >= 0) {
				ByteBuffer buffer = null;
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
					buffer = codec.getInputBuffer(inIndex);
				} else {
					buffer = codec.getInputBuffers()[inIndex];
				}
				int sampleSize = extractor.readSampleData(buffer, 0);
				if (sampleSize < 0) {
					codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
				} else {
					info.flags &= ~MediaCodec.BUFFER_FLAG_END_OF_STREAM;
					codec.queueInputBuffer(inIndex, 0, sampleSize, extractor.getSampleTime(), 0);
					extractor.advance();
					continue;
				}
			}
			int activeIndex = codec.dequeueOutputBuffer(info, TIMEOUT_US);
			if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
				break;
			}
			switch (activeIndex) {
				case MediaCodec.INFO_OUTPUT_FORMAT_CHANGED:
				case MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED:
				case MediaCodec.INFO_TRY_AGAIN_LATER:
					/* nothing to do */
					break;
				default:
					ByteBuffer buffer;
					if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
						buffer = codec.getOutputBuffer(activeIndex);
					} else {
						buffer = codec.getOutputBuffers()[activeIndex];
					}
					byte[] pcm16 = new byte[info.size - info.offset];
					buffer.get(pcm16);
					buffer.clear();
					codec.releaseOutputBuffer(activeIndex, false);
					if (pcm16.length > 0) {
						return pcm16;
					}
					break;
			}
		}
		return null;
	}

	public byte[] readPCMFloat() {
		if (wavReader != null) {
			return wavReader.readPCMFloat();
		}
		byte[] buf = readPCM16();
		if (buf != null) {
			ByteBuffer bb1 = ByteBuffer.wrap(buf).order(ByteOrder.nativeOrder());
			ByteBuffer bb2 = ByteBuffer.allocate(buf.length * 2).order(ByteOrder.nativeOrder());
			for (int cnt = buf.length / Short.BYTES; cnt-- > 0; ) {
				bb2.putFloat(bb1.getShort() / 32768.0f);
			}
			buf = bb2.array();
		}
		return buf;
	}

	public boolean seekTo(float time) {
		if (wavReader != null) {
			return wavReader.seekTo(time);
		}
		if (extractor != null) {
			long target = (long)(time * 1000000);
			extractor.seekTo(target, MediaExtractor.SEEK_TO_NEXT_SYNC);
			long cur;
			while ((cur = extractor.getSampleTime()) < target) {
				if (cur == -1) break; // no more samples are available.
				extractor.advance();
			}
			codec.flush();
			return true;
		}
		return false;
	}

}

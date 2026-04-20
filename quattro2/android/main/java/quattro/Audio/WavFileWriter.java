//
//	WavFileWriter.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.media.MediaFormat;

import java.io.DataOutputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class WavFileWriter {

	private String path = null;
	private DataOutputStream out = null;
	private WavFileHeader wavHeader = null;

	public boolean open(String path, MediaFormat outputFormat) throws FileNotFoundException {
		close();
		this.path = path;
		out = new DataOutputStream(new FileOutputStream(path));
		return writeHeader(outputFormat);
	}

	public boolean close() {
		boolean success = true;
		if (out != null) {
			try {
				out.close();
				success = writeDataSize();
			} catch (IOException e) {}
			out = null;
		}
		return success;
	}

	private boolean writeHeader(MediaFormat outputFormat) {
		wavHeader = new WavFileHeader(outputFormat);
		try {
			out.writeBytes(WavFileHeader.RIFF);
			out.write(intToByteArray(wavHeader.nRiffSize), 0, 4);
			out.writeBytes(WavFileHeader.WAVE);
			out.writeBytes(WavFileHeader.FMT);
			out.write(intToByteArray(wavHeader.nFmtSize), 0, 4);
			out.write(shortToByteArray(wavHeader.wFormatTag), 0, 2);
			out.write(shortToByteArray(wavHeader.nChannels), 0, 2);
			out.write(intToByteArray(wavHeader.nSamplesPerSec), 0, 4);
			out.write(intToByteArray(wavHeader.nAvgBytesPerSec), 0, 4);
			out.write(shortToByteArray(wavHeader.nBlockAlign), 0, 2);
			out.write(shortToByteArray(wavHeader.wBitsPerSample), 0, 2);
			out.writeBytes(WavFileHeader.DATA);
			out.write(intToByteArray(wavHeader.nDataSize), 0, 4);
		} catch (IOException e) {
			close();
			return false;
		}
		return true;
	}

	private boolean writeDataSize() {
		try {
			RandomAccessFile wavFile = new RandomAccessFile(path, "rw");
			wavFile.seek(WavFileHeader.OFFSET_RIFF_SIZE);
			wavFile.write(intToByteArray((wavHeader.nDataSize + WavFileHeader.RIFF_SIZE)), 0, 4);
			wavFile.seek(WavFileHeader.OFFSET_DATA_SIZE);
			wavFile.write(intToByteArray((wavHeader.nDataSize)), 0, 4);
			wavFile.close();
		} catch (IOException e) {
			return false;
		}
		return true;
	}

	public boolean writePCM16(byte[] pcm16) {
		if ((out == null) || (pcm16 == null)) {
			return false;
		}

		int inFrames = pcm16.length / (Short.BYTES * wavHeader.nChannels);
		int len = inFrames * wavHeader.nBlockAlign;
		int cnt = inFrames * wavHeader.nChannels;

		ByteBuffer buf = ByteBuffer.wrap(pcm16).order(ByteOrder.nativeOrder());
		ByteBuffer bb = ByteBuffer.allocate(len).order(ByteOrder.LITTLE_ENDIAN);

		if (wavHeader.wFormatTag == WavFileHeader.WAVE_FORMAT_IEEE_FLOAT) {
			for (int i = 0; i < cnt; i++) {
				bb.putFloat(buf.getShort() / 32768.0f);
			}
		} else { /* WavFileHeader.WAVE_FORMAT_PCM */
			switch (wavHeader.wBitsPerSample) {
				case  8:
					for (int i = 0; i < cnt; i++) {
						int x = buf.getShort() + 0x8000;
						bb.put((byte)(x >> 8));
					}
					break;
				case 16:
					for (int i = 0; i < cnt; i++) {
						bb.putShort(buf.getShort());
					}
					break;
				case 24:
					for (int i = 0; i < cnt; i++) {
						int x = buf.getShort();
						bb.put((byte)0);
						bb.put((byte)(x >> 0));
						bb.put((byte)(x >> 8));
					}
					break;
				case 32:
					for (int i = 0; i < cnt; i++) {
						bb.putInt(buf.getShort() << 16);
					}
					break;
			}
		}
		try {
			out.write(bb.array());
		} catch (IOException e) {
			return false;
		}
		wavHeader.nDataSize += len;
		return true;
	}

	public boolean writePCMFloat(byte[] pcm) {
		if ((out == null) || (pcm == null)) {
			return false;
		}

		int inFrames = pcm.length / (Float.BYTES * wavHeader.nChannels);
		int len = inFrames * wavHeader.nBlockAlign;
		int cnt = inFrames * wavHeader.nChannels;

		ByteBuffer buf = ByteBuffer.wrap(pcm).order(ByteOrder.nativeOrder());
		ByteBuffer bb = ByteBuffer.allocate(len).order(ByteOrder.LITTLE_ENDIAN);

		if (wavHeader.wFormatTag == WavFileHeader.WAVE_FORMAT_IEEE_FLOAT) {
			for (int i = 0; i < cnt; i++) {
				bb.putFloat(buf.getFloat());
			}
		} else { /* WavFileHeader.WAVE_FORMAT_PCM */
			switch (wavHeader.wBitsPerSample) {
				case  8:
					for (int i = 0; i < cnt; i++) {
						int x = (int)(buf.getFloat() * 0x80) + 128;
						if (x > 255) { x = 255; }
						if (x < 0) { x = 0; }
						bb.put((byte)(x));
					}
					break;
				case 16:
					for (int i = 0; i < cnt; i++) {
						int x = (int)(buf.getFloat() * 0x8000);
						if (x > Short.MAX_VALUE) { x = Short.MAX_VALUE; }
						if (x < Short.MIN_VALUE) { x = Short.MIN_VALUE; }
						bb.putShort((short)x);
					}
					break;
				case 24:
					for (int i = 0; i < cnt; i++) {
						int x = (int)(buf.getFloat() * 0x800000);
						if (x >  0x7fffff) { x =  0x7fffff; }
						if (x < -0x800000) { x = -0x800000; }
						bb.put((byte)(x >>  0));
						bb.put((byte)(x >>  8));
						bb.put((byte)(x >> 16));
					}
					break;
				case 32:
					for (int i = 0; i < cnt; i++) {
						long x = (long)(buf.getFloat() * 0x80000000L);
						if (x > Integer.MAX_VALUE) { x = Integer.MAX_VALUE; }
						if (x < Integer.MIN_VALUE) { x = Integer.MIN_VALUE; }
						bb.putInt((int)x);
					}
					break;
			}
		}
		try {
			out.write(bb.array());
		} catch (IOException e) {
			return false;
		}
		wavHeader.nDataSize += len;
		return true;
	}

	private static byte[] intToByteArray(int data) {
		return ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(data).array();
	}

	private static byte[] shortToByteArray(short data) {
		return ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(data).array();
	}

}

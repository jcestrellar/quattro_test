//
//	WavFileReader.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.media.AudioFormat;
import android.media.MediaFormat;
import android.net.Uri;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class WavFileReader {

	public static final int MAX_READ_FRAMES = 4096;

	private RandomAccessFile in = null;
	private WavFileHeader wavHeader = null;
	private byte[] buffer = null;

	public boolean open(String path) throws FileNotFoundException {
		close();
		in = new RandomAccessFile(Uri.parse(path).getSchemeSpecificPart(), "r");
		return readHeader();
	}

	public void close() {
		if (in != null) {
			try {
				in.close();
			} catch (IOException e) {}
			in = null;
		}
	}

	private boolean readHeader() {
		wavHeader = new WavFileHeader();
		try {
			byte[] intValue = new byte[4];
			byte[] shortValue = new byte[2];

			String chunkID = "" + (char) in.readByte() + (char) in.readByte() + (char) in.readByte() + (char) in.readByte();
			in.read(intValue);
			wavHeader.nRiffSize = getInt(intValue);
			String formatID = "" + (char) in.readByte() + (char) in.readByte() + (char) in.readByte() + (char) in.readByte();
			if (!chunkID.equals(WavFileHeader.RIFF) || !formatID.equals(WavFileHeader.WAVE)) {
				return false;
			}

			while (in.getFilePointer() < in.length()) {
				chunkID = "" + (char)in.readByte() + (char)in.readByte() + (char)in.readByte() + (char)in.readByte();
				if (chunkID.equals(WavFileHeader.FMT)) {
					in.read(intValue);   wavHeader.nFmtSize        = getInt(intValue);
					in.read(shortValue); wavHeader.wFormatTag      = getShort(shortValue);
					in.read(shortValue); wavHeader.nChannels       = getShort(shortValue);
					in.read(intValue);   wavHeader.nSamplesPerSec  = getInt(intValue);
					in.read(intValue);   wavHeader.nAvgBytesPerSec = getInt(intValue);
					in.read(shortValue); wavHeader.nBlockAlign     = getShort(shortValue);
					in.read(shortValue); wavHeader.wBitsPerSample  = getShort(shortValue);
					if (wavHeader.wFormatTag == WavFileHeader.WAVE_FORMAT_EXTENSIBLE) {
						in.skipBytes(8);
						in.read(intValue); wavHeader.wFormatTag = (short)getInt(intValue);
						in.skipBytes(wavHeader.nFmtSize - 28);
 					} else {
						in.skipBytes(wavHeader.nFmtSize - 16);
					}
					if ((wavHeader.wFormatTag != WavFileHeader.WAVE_FORMAT_PCM) &&
						(wavHeader.wFormatTag != WavFileHeader.WAVE_FORMAT_IEEE_FLOAT)) {
						return false;
					}
					if (wavHeader.nDataOffset > 0) {
						break;
					}
				} else if (chunkID.equals(WavFileHeader.DATA)) {
					in.read(intValue);
					wavHeader.nDataSize = getInt(intValue);
					wavHeader.nDataOffset = (int)in.getFilePointer();
					if (wavHeader.wFormatTag != 0) {
						break;
					}
				} else {
					in.read(intValue);
					in.skipBytes(getInt(intValue));
				}
			}
			in.seek(wavHeader.nDataOffset);
			buffer = new byte[MAX_READ_FRAMES * wavHeader.nBlockAlign];
			return true;
		} catch (IOException e) {
			close();
			return false;
		}
	}

	public MediaFormat getFileFormat() {
		if (wavHeader == null) {
			return null;
		}
		MediaFormat format = MediaFormat.createAudioFormat(
				WavFileHeader.MIMETYPE_AUDIO_WAV, wavHeader.nSamplesPerSec, wavHeader.nChannels);
		int encoding = AudioFormat.ENCODING_PCM_16BIT;
		if (wavHeader.wFormatTag == WavFileHeader.WAVE_FORMAT_IEEE_FLOAT) {
			encoding = AudioFormat.ENCODING_PCM_FLOAT;
		} else {
			switch (wavHeader.wBitsPerSample) {
				case 8:  encoding = AudioFormat.ENCODING_PCM_8BIT; break;
				case 16: encoding = AudioFormat.ENCODING_PCM_16BIT; break;
				case 24: encoding = AudioFormat.ENCODING_PCM_24BIT_PACKED; break;
				case 32: encoding = AudioFormat.ENCODING_PCM_32BIT; break;
			}
		}
		format.setInteger(MediaFormat.KEY_PCM_ENCODING, encoding);
		format.setInteger(MediaFormat.KEY_BIT_RATE, wavHeader.nAvgBytesPerSec * 8);
		long frames = wavHeader.nDataSize / wavHeader.nBlockAlign;
		format.setLong(MediaFormat.KEY_DURATION,frames * 1000000 / wavHeader.nSamplesPerSec);
		return format;
	}

	public long getSampleTime() {
		if (in != null) {
			try {
				long offset = in.getFilePointer() - wavHeader.nDataOffset;
				long frames = offset / wavHeader.nBlockAlign;
				return frames * 1000000 / wavHeader.nSamplesPerSec;
			} catch (IOException e) { }
		}
		return 0;
	}

	public byte[] readPCM16() {
		if (in == null) {
			return null;
		}
		int len = 0;
		try {
			len = in.read(buffer);
		} catch (IOException e) { }
		if (len <= 0) {
			return null;
		}

		int blk = wavHeader.nBlockAlign / wavHeader.nChannels;
		int cnt = len / blk;

		ByteBuffer bb1 = ByteBuffer.wrap(buffer).order(ByteOrder.LITTLE_ENDIAN);
		ByteBuffer bb2 = ByteBuffer.allocate(cnt * Short.BYTES).order(ByteOrder.nativeOrder());

		if (wavHeader.wFormatTag == WavFileHeader.WAVE_FORMAT_IEEE_FLOAT) {
			for (int i = 0; cnt-- > 0; i += blk) {
				bb2.putShort((short)(bb1.getFloat(i) * 0x7fff));
			}
			return bb2.array();
		}
		switch (wavHeader.wBitsPerSample) {
			case  8:
				for (int i = 0; cnt-- > 0; i += blk) {
					int x = Byte.toUnsignedInt(bb1.get(i));
					bb2.putShort((short)((x - 128) << 8));
				}
				break;
			case 16:
				for (int i = 0; cnt-- > 0; i += blk) {
					bb2.putShort(bb1.getShort(i));
				}
				break;
			case 24:
				for (int i = 0; cnt-- > 0; i += blk) {
					bb2.putShort(bb1.getShort(i + 1));
				}
				break;
			case 32:
				for (int i = 0; cnt-- > 0; i += blk) {
					bb2.putShort((short)(bb1.getInt(i) >> 16));
				}
				break;
		}
		return bb2.array();
	}

	public byte[] readPCMFloat() {
		if (in == null) {
			return null;
		}
		int len = 0;
		try {
			len = in.read(buffer);
		} catch (IOException e) { }
		if (len <= 0) {
			return null;
		}

		int blk = wavHeader.nBlockAlign / wavHeader.nChannels;
		int cnt = len / blk;

		ByteBuffer bb1 = ByteBuffer.wrap(buffer).order(ByteOrder.LITTLE_ENDIAN);
		ByteBuffer bb2 = ByteBuffer.allocate(cnt * Float.BYTES).order(ByteOrder.nativeOrder());

		if (wavHeader.wFormatTag == WavFileHeader.WAVE_FORMAT_IEEE_FLOAT) {
			for (int i = 0; cnt-- > 0; i += blk) {
				bb2.putFloat(bb1.getFloat(i));
			}
			return bb2.array();
		}
		switch (wavHeader.wBitsPerSample) {
			case 8:
				for (int i = 0; cnt-- > 0; i += blk) {
					int x = Byte.toUnsignedInt(bb1.get(i));
					bb2.putFloat((x - 128) / (float)0x80);
				}
				break;
			case 16:
				for (int i = 0; cnt-- > 0; i += blk) {
					bb2.putFloat(bb1.getShort(i) / (float)0x8000);
				}
				break;
			case 24:
				for (int i = 0; cnt-- > 0; i += blk) {
					int x = (bb1.get(i + 2) << 16) | ((bb1.get(i + 1) << 8) & 0xff00) | (bb1.get(i) & 0xff);
					bb2.putFloat(x / (float)0x800000);
				}
				break;
			case 32:
				for (int i = 0; cnt-- > 0; i += blk) {
					bb2.putFloat(bb1.getInt(i) / (float)0x80000000L);
				}
				break;
		}
		return bb2.array();
	}

	public boolean seekTo(float time) {
		if (in != null) {
			long frame = (long)(time * wavHeader.nSamplesPerSec);
			long offset = (frame * wavHeader.nBlockAlign) + wavHeader.nDataOffset;
			try {
				in.seek(offset);
				return true;
			} catch (IOException e) { }
		}
		return false;
	}

	private static short getShort(byte[] b) {
		return ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN).getShort();
	}

	private static int getInt(byte[] b) {
		return ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN).getInt();
	}

}

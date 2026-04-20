//
//	WavFileHeader.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import android.media.AudioFormat;
import android.media.MediaFormat;

public class WavFileHeader {

	public static final String MIMETYPE_AUDIO_WAV = "audio/wav";

	public static final int WAVE_FORMAT_PCM = 0x0001;
	public static final int WAVE_FORMAT_IEEE_FLOAT = 0x0003;
	public static final int WAVE_FORMAT_EXTENSIBLE = -2;

	public static final int RIFF_SIZE = 36;
	public static final int OFFSET_RIFF_SIZE = 4;
	public static final int OFFSET_DATA_SIZE = 40;

    public static final String RIFF = "RIFF";
    public int nRiffSize = 0;
    public static final String WAVE = "WAVE";

    public static final String FMT = "fmt ";
	public int   nFmtSize        = 16;
	public short wFormatTag      = 0;
	public short nChannels       = 0;
	public int   nSamplesPerSec  = 0;
	public int   nAvgBytesPerSec = 0;
	public short nBlockAlign     = 0;
	public short wBitsPerSample  = 0;

	public static final String DATA = "data";
    public int nDataSize = 0;
	public int nDataOffset = 0;

	public WavFileHeader() {}

	public WavFileHeader(MediaFormat outputFormat) {
		int sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
		int channels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
		int encoding = outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING);
		switch (encoding) {
			case AudioFormat.ENCODING_PCM_8BIT:
				wFormatTag = WAVE_FORMAT_PCM;
				wBitsPerSample = 8;
				break;
			case AudioFormat.ENCODING_PCM_16BIT:
				wFormatTag = WAVE_FORMAT_PCM;
				wBitsPerSample = 16;
				break;
			case AudioFormat.ENCODING_PCM_24BIT_PACKED:
				wFormatTag = WAVE_FORMAT_PCM;
				wBitsPerSample = 24;
				break;
			case AudioFormat.ENCODING_PCM_32BIT:
				wFormatTag = WAVE_FORMAT_PCM;
				wBitsPerSample = 32;
				break;
			case AudioFormat.ENCODING_PCM_FLOAT:
				wFormatTag = WAVE_FORMAT_IEEE_FLOAT;
				wBitsPerSample = 32;
				break;
		}
		nChannels       = (short)channels;
		nSamplesPerSec  = sampleRate;
		nBlockAlign     = (short)((wBitsPerSample / 8) * nChannels);
		nAvgBytesPerSec = nBlockAlign * nSamplesPerSec;
	}

}

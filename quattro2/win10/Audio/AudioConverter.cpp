//
// @(#)AudioConverter.cpp
//
// Copyright 2022 Roland Corporation. All rights reserved.
//

#include "AudioConverter.h"
#include <assert.h>

#if _MSC_VER <= 1700
EXTERN_GUID( MFTranscodeContainerType_WAVE, 0x64c3453c, 0x0f26, 0x4741, 0xbe, 0x63, 0x87, 0xbd, 0xf8, 0xbb, 0x93, 0x5b );
#endif

bool AudioConverter::format(LPCTSTR file, WAVEFORMATEX* pwfe, float* duration)
{
	CComPtr<IMFSourceReader> reader;
	HRESULT hr = S_OK;

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateSourceReaderFromURL(file, NULL, &reader);
	}
	if (SUCCEEDED(hr) && pwfe) {
		CComPtr<IMFMediaType> current_type;
		hr = reader->GetCurrentMediaType(
				(DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, &current_type);
		if (SUCCEEDED(hr)) {
			UINT32 size = 0;
			WAVEFORMATEX* _pwfe = 0;
			hr = ::MFCreateWaveFormatExFromMFMediaType(current_type, &_pwfe, &size);
			if (_pwfe) {
				memcpy(pwfe, _pwfe, sizeof(WAVEFORMATEX));
				if (pwfe->wFormatTag == WAVE_FORMAT_EXTENSIBLE) {
					pwfe->wFormatTag = (WORD)((WAVEFORMATEXTENSIBLE*)_pwfe)->SubFormat.Data1;
				}
				::CoTaskMemFree(_pwfe);
			}
		}
	}
	if (SUCCEEDED(hr) && duration) {
		PROPVARIANT var;
		::PropVariantInit(&var);
		hr = reader->GetPresentationAttribute(
				(DWORD)MF_SOURCE_READER_MEDIASOURCE, MF_PD_DURATION, &var);
		if (SUCCEEDED(hr)) {
			*duration = (var.hVal.QuadPart / 10000000.0f);
		}
		::PropVariantClear(&var);
	}

	return SUCCEEDED(hr);
}

bool AudioConverter::convert(LPCTSTR in, LPCTSTR out, const WAVEFORMATEX* pwfe)
{
	CComPtr<IMFMediaType> in_type;
	CComPtr<IMFMediaType> out_type;
	HRESULT hr = S_OK;

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateMediaType(&in_type);
	}
	if (SUCCEEDED(hr)) {
		if ((pwfe->wFormatTag == WAVE_FORMAT_PCM) ||
			(pwfe->wFormatTag == WAVE_FORMAT_IEEE_FLOAT)) {
			UINT32 bitsPerSample = sizeof(float) * 8;
			UINT32 blockAlign = ((bitsPerSample / 8) * pwfe->nChannels);
			UINT32 bytesPerSecond = (blockAlign * pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = in_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = in_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_Float);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, bitsPerSample);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, blockAlign);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, bytesPerSecond);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
		} else {
			UINT32 bitsPerSample = 16; /* fixed */
			UINT32 blockAlign = ((bitsPerSample / 8) * pwfe->nChannels);
			UINT32 bytesPerSecond = (blockAlign * pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = in_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = in_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_PCM);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, bitsPerSample);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, blockAlign);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, bytesPerSecond);
			if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
		}
	}

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateMediaType(&out_type);
	}
	if (SUCCEEDED(hr)) {
		if (pwfe->wFormatTag == WAVE_FORMAT_PCM) {
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_PCM);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, pwfe->wBitsPerSample);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, pwfe->nBlockAlign);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, pwfe->nAvgBytesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
		} else if (pwfe->wFormatTag == WAVE_FORMAT_IEEE_FLOAT) {
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_Float);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, pwfe->wBitsPerSample);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, pwfe->nBlockAlign);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, pwfe->nAvgBytesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
		} else if (pwfe->wFormatTag == WAVE_FORMAT_MPEG_HEAAC) {
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_AAC);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, 16); /* fixed */
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, pwfe->nAvgBytesPerSec);
		} else if (pwfe->wFormatTag == WAVE_FORMAT_MPEGLAYER3) {
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_MP3);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, pwfe->nAvgBytesPerSec);
		} else {
			hr = E_ABORT;
		}
	}

	CComPtr<IMFSourceReader> reader;

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateSourceReaderFromURL(in, NULL, &reader);
	}
	if (SUCCEEDED(hr)) {
		hr = reader->SetStreamSelection((DWORD)MF_SOURCE_READER_ALL_STREAMS, FALSE);
	}
	if (SUCCEEDED(hr)) {
		hr = reader->SetStreamSelection((DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, TRUE);
	}
	if (SUCCEEDED(hr)) {
		hr = reader->SetCurrentMediaType((DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, NULL, in_type);
	}

	{
		CComPtr<IMFAttributes> config;
		CComPtr<IMFSinkWriter> writer;
		DWORD streamIndex;

		if (SUCCEEDED(hr)) {
			hr = ::MFCreateAttributes(&config, 1);
		}
		if (SUCCEEDED(hr)) {
			switch (pwfe->wFormatTag) {
				case WAVE_FORMAT_PCM:
				case WAVE_FORMAT_IEEE_FLOAT:
					hr = config->SetGUID(MF_TRANSCODE_CONTAINERTYPE, MFTranscodeContainerType_WAVE);
					break;
				case WAVE_FORMAT_MPEG_HEAAC:
					hr = config->SetGUID(MF_TRANSCODE_CONTAINERTYPE, MFTranscodeContainerType_MPEG4);
					break;
				case WAVE_FORMAT_MPEGLAYER3:
					hr = config->SetGUID(MF_TRANSCODE_CONTAINERTYPE, MFTranscodeContainerType_MP3);
					break;
			}
		}
		if (SUCCEEDED(hr)) {
			hr = ::MFCreateSinkWriterFromURL(out, NULL, config, &writer);
		}
		if (SUCCEEDED(hr)) {
			hr = writer->AddStream(out_type, &streamIndex);
		}
		if (SUCCEEDED(hr)) {
			hr = writer->SetInputMediaType(streamIndex, in_type, NULL);
		}
		if (SUCCEEDED(hr)) {
			hr = writer->BeginWriting();
		}
		while (SUCCEEDED(hr)) {
			DWORD dwFlags = 0;
			CComPtr<IMFSample> sample;
			hr = reader->ReadSample(
					(DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, 0, NULL, &dwFlags, NULL, &sample);
			if (SUCCEEDED(hr)) {
				if (dwFlags & MF_SOURCE_READERF_CURRENTMEDIATYPECHANGED) break;
				if (dwFlags & MF_SOURCE_READERF_ENDOFSTREAM) break;
				if (sample == 0) continue;
				hr = writer->WriteSample(streamIndex, sample);
			}
		}
		if (SUCCEEDED(hr)) {
			hr = writer->Finalize();
		}
	}

	if (FAILED(hr)) {
		::DeleteFile(out);
	}
	return SUCCEEDED(hr);
}

bool AudioConverter::split(LPCTSTR in, const std::vector<CString>& outs)
{
	WAVEFORMATEX in_wfe;
	WAVEFORMATEX out_wfe;
	int channels = 0;

	if (!format(in, &in_wfe, 0)) {
		return false;
	}

	if (outs.size() > 0) {
		channels = min(in_wfe.nChannels / (int)outs.size(), 2);
	}
	if (channels == 0) {
		return false;
	}

	CString tmpfile;
	if ((in_wfe.wFormatTag != WAVE_FORMAT_PCM) &&
		(in_wfe.wFormatTag != WAVE_FORMAT_IEEE_FLOAT)) {

		in_wfe.wFormatTag = WAVE_FORMAT_PCM;
		in_wfe.wBitsPerSample = 16;
		in_wfe.nBlockAlign = (in_wfe.wBitsPerSample / 8) * in_wfe.nChannels;
		in_wfe.nAvgBytesPerSec = in_wfe.nBlockAlign * in_wfe.nSamplesPerSec;

		TCHAR path[MAX_PATH];
		TCHAR name[MAX_PATH];
		::GetTempPath(MAX_PATH, path);
		::GetTempFileName(path, TEXT("___"), 0, name);
		tmpfile = CString(name) + TEXT(".wav");
		if (convert(in, tmpfile, &in_wfe)) {
			in = tmpfile;
		} else {
			return false;
		}
	}

	memcpy(&out_wfe, &in_wfe, sizeof(WAVEFORMATEX));
	out_wfe.nChannels = channels;
	out_wfe.nBlockAlign = (out_wfe.wBitsPerSample / 8) * out_wfe.nChannels;
	out_wfe.nAvgBytesPerSec = out_wfe.nBlockAlign * out_wfe.nSamplesPerSec;

	WAVFileIO reader;
	WAVFileIO* writers = 0;

	HRESULT hr = reader.open(in);
	if (SUCCEEDED(hr)) {
		writers = new WAVFileIO[outs.size()];
		for (size_t n = 0; n < outs.size() && SUCCEEDED(hr); n++) {
			hr = writers[n].create(outs[n], &out_wfe);
		}
	}

	if (SUCCEEDED(hr)) {
		int buflen = in_wfe.nBlockAlign * 0x4000;
		char* buf1 = new char[buflen];
		char* buf2 = new char[buflen];
		while (SUCCEEDED(hr)) {
			LONG len = reader.read(buf1, buflen);
			if (len == 0) {
				break;
			} else if (len > 0) {
				int frames = len / in_wfe.nBlockAlign;
				for (size_t n = 0, ch = 0; n < outs.size() && SUCCEEDED(hr); n++, ch += channels) {
					char* p = buf1 + (ch * (in_wfe.nBlockAlign / in_wfe.nChannels));
					char* q = buf2;
					for (int cnt = frames; cnt > 0; cnt--) {
						memcpy(q, p, out_wfe.nBlockAlign);
						p += in_wfe.nBlockAlign;
						q += out_wfe.nBlockAlign;
					}
					hr = writers[n].write(buf2, frames * out_wfe.nBlockAlign);
				}
			} else {
				hr = E_ABORT;
			}
		}
		delete [] buf1;
		delete [] buf2;
	}

	delete [] writers;

	if (!tmpfile.IsEmpty()) {
		::DeleteFile(tmpfile);
	}

	if (FAILED(hr)) {
		for (size_t n = 0; n < outs.size(); n++) {
			::DeleteFile(outs[n]);
		}
	}

	return SUCCEEDED(hr);
}

bool AudioConverter::reverse(LPCTSTR in, LPCTSTR out)
{
	WAVEFORMATEX wfe;
	if (!format(in, &wfe, 0)) {
		return false;
	}

	CString tmpfile1;
	if ((wfe.wFormatTag != WAVE_FORMAT_PCM) &&
		(wfe.wFormatTag != WAVE_FORMAT_IEEE_FLOAT)) {

		wfe.wFormatTag = WAVE_FORMAT_PCM;
		wfe.wBitsPerSample = 16;
		wfe.nBlockAlign = (wfe.wBitsPerSample / 8) * wfe.nChannels;
		wfe.nAvgBytesPerSec = wfe.nBlockAlign * wfe.nSamplesPerSec;

		TCHAR path[MAX_PATH];
		TCHAR name[MAX_PATH];
		::GetTempPath(MAX_PATH, path);
		::GetTempFileName(path, TEXT("___"), 0, name);
		tmpfile1 = CString(name) + TEXT(".wav");
		if (convert(in, tmpfile1, &wfe)) {
			in = tmpfile1;
		} else {
			return false;
		}
	}

	WAVFileIO reader;
	WAVFileIO* writer = 0;
	CString tmpfile2;
	HANDLE htmp = INVALID_HANDLE_VALUE;

	HRESULT hr = reader.open(in);
	if (SUCCEEDED(hr)) {
		TCHAR path[MAX_PATH];
		TCHAR name[MAX_PATH];
		::GetTempPath(MAX_PATH, path);
		::GetTempFileName(path, TEXT("___"), 0, name);
		tmpfile2 = CString(name) + TEXT(".dat");
		htmp = ::CreateFile(tmpfile2,
			GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_ALWAYS, 0, NULL);
		hr = (htmp != INVALID_HANDLE_VALUE) ? S_OK : E_ABORT;
	}

	if (SUCCEEDED(hr)) {
		int buflen = wfe.nBlockAlign * 0x4000;
		char* buf = new char[buflen];
		while (SUCCEEDED(hr)) {
			LONG len = reader.read(buf, buflen);
			if (len == 0) {
				break;
			} else if (len > 0) {
				DWORD bytes = 0;
				::WriteFile(htmp, buf, len, &bytes, NULL);
				assert(bytes == len);
			} else {
				hr = E_ABORT;
			}
		}
		delete [] buf;
	}

	if (SUCCEEDED(hr)) {
		writer = new WAVFileIO();
		hr = writer->create(out, &wfe);
	}
	if (SUCCEEDED(hr)) {
		int buflen = wfe.nBlockAlign * 0x4000;
		char* buf1 = new char[buflen];
		char* buf2 = new char[buflen];

		LARGE_INTEGER distance, curpos;
		distance.QuadPart = 0;
		::SetFilePointerEx(htmp, distance, &curpos, FILE_END);
		while (curpos.QuadPart > 0) {
			if (curpos.QuadPart < buflen) {
				buflen = (int)curpos.QuadPart;
			}
			distance.QuadPart = -buflen;
			::SetFilePointerEx(htmp, distance, 0, FILE_CURRENT);
			DWORD bytes = 0;
			::ReadFile(htmp, buf1, buflen, &bytes, NULL);
			assert(bytes == buflen);
			/* reverse the buf1 data to buf2 */
			char* p = buf2;
			char* q = buf1 + bytes - wfe.nBlockAlign;
			for ( ; bytes > 0; bytes -= wfe.nBlockAlign) {
				memcpy(p, q, wfe.nBlockAlign);
				p += wfe.nBlockAlign;
				q -= wfe.nBlockAlign;
			}
			LONG ret = writer->write(buf2, buflen);
			if (ret < 0) {
				hr = E_ABORT;
				break;
			}
			::SetFilePointerEx(htmp, distance, &curpos, FILE_CURRENT);
		}

		delete [] buf1;
		delete [] buf2;
	}

	delete writer;

	if (htmp != INVALID_HANDLE_VALUE) {
		::CloseHandle(htmp);
	}
	if (!tmpfile1.IsEmpty()) {
		::DeleteFile(tmpfile1);
	}
	if (!tmpfile2.IsEmpty()) {
		::DeleteFile(tmpfile2);
	}

	if (FAILED(hr)) {
		::DeleteFile(out);
	}

	return SUCCEEDED(hr);
}

HRESULT AudioConverter::WAVFileIO::open(LPCTSTR in)
{
	close();

	MMRESULT result = MMSYSERR_NOERROR;

	if (result == MMSYSERR_NOERROR) {
		m_hmmio = ::mmioOpen((LPTSTR)in, NULL, MMIO_READ | MMIO_DENYNONE);
		if (m_hmmio == NULL) {
			result = MMSYSERR_INVALHANDLE;
		}
	}
	if (result == MMSYSERR_NOERROR) {
		m_mmckRiff.fccType = ::mmioStringToFOURCC(TEXT("WAVE"),  0);
		result = ::mmioDescend(m_hmmio, &m_mmckRiff, NULL, MMIO_FINDRIFF);
	}
	if (result == MMSYSERR_NOERROR) {
		m_mmckFmt.ckid = ::mmioStringToFOURCC(TEXT("fmt "), 0);
		result = ::mmioDescend(m_hmmio, &m_mmckFmt, NULL, MMIO_FINDCHUNK);
	}
	if (result == MMSYSERR_NOERROR) {
		BYTE* pwfe = new BYTE [m_mmckFmt.cksize];
		LONG result = ::mmioRead(m_hmmio, (HPSTR)pwfe, m_mmckFmt.cksize);
		if (result == m_mmckFmt.cksize) {
			memcpy(&m_wfe, pwfe, min(m_mmckFmt.cksize, sizeof(WAVEFORMATEX)));
			if (((WAVEFORMATEX*)pwfe)->wFormatTag == WAVE_FORMAT_EXTENSIBLE) {
				m_wfe.wFormatTag = (WORD)((WAVEFORMATEXTENSIBLE*)pwfe)->SubFormat.Data1;
			}
			if ((m_wfe.wFormatTag == WAVE_FORMAT_PCM) ||
				(m_wfe.wFormatTag == WAVE_FORMAT_IEEE_FLOAT)) {
				result = MMSYSERR_NOERROR;
			}
		}
		delete [] pwfe;
	}
	if (result == MMSYSERR_NOERROR) {
		result = ::mmioAscend(m_hmmio, &m_mmckFmt, 0);
	}
	if (result == MMSYSERR_NOERROR) {
		m_mmckData.ckid = ::mmioStringToFOURCC(TEXT("data"), 0);
		result = ::mmioDescend(m_hmmio, &m_mmckData, NULL, MMIO_FINDCHUNK);
	}

	return (result == MMSYSERR_NOERROR) ? S_OK : E_ABORT;
}

HRESULT AudioConverter::WAVFileIO::create(LPCTSTR out, const WAVEFORMATEX* pwfe)
{
	close();

	MMRESULT result = MMSYSERR_NOERROR;

	if (result == MMSYSERR_NOERROR) {
		m_hmmio = ::mmioOpen((LPTSTR)out, NULL, MMIO_CREATE | MMIO_WRITE);
		if (m_hmmio == NULL) {
			result = MMSYSERR_INVALHANDLE;
		}
	}
	if (result == MMSYSERR_NOERROR) {
		m_mmckRiff.fccType = ::mmioStringToFOURCC(TEXT("WAVE"), 0);
		result = ::mmioCreateChunk(m_hmmio, &m_mmckRiff, MMIO_CREATERIFF);
	}
	if (result == MMSYSERR_NOERROR) {
		m_mmckFmt.ckid = ::mmioStringToFOURCC(TEXT("fmt "), 0);
		result = ::mmioCreateChunk(m_hmmio, &m_mmckFmt, 0);
	}
	if (result == MMSYSERR_NOERROR) {
		LONG ret = ::mmioWrite(m_hmmio, (char *)pwfe, sizeof(WAVEFORMATEX));
		if (ret != sizeof(WAVEFORMATEX)) {
			result = MMSYSERR_WRITEERROR;
		} else {
			result = ::mmioAscend(m_hmmio, &m_mmckFmt, 0);
		}
	}
	if (result == MMSYSERR_NOERROR) {
		m_mmckData.ckid = ::mmioStringToFOURCC(TEXT("data"), 0);
		result = ::mmioCreateChunk(m_hmmio, &m_mmckData, 0);
	}

	return (result == MMSYSERR_NOERROR) ? S_OK : E_ABORT;
}

HRESULT AudioConverter::WAVFileIO::close()
{
	MMRESULT result = MMSYSERR_NOERROR;

	if (m_hmmio) {
		if (result == MMSYSERR_NOERROR) {
			result = ::mmioAscend(m_hmmio, &m_mmckData, 0);
		}
		if (result == MMSYSERR_NOERROR) {
			result = ::mmioAscend(m_hmmio, &m_mmckRiff, 0);
		}
		if (result == MMSYSERR_NOERROR) {
			result = ::mmioClose(m_hmmio, 0);
		}
		m_hmmio = NULL;
	}

	return (result == MMSYSERR_NOERROR) ? S_OK : E_ABORT;
}

LONG AudioConverter::WAVFileIO::read(char* buf, LONG buflen)
{
	if (m_hmmio) {
		return ::mmioRead(m_hmmio, buf, buflen);
	}
	return -1;
}

LONG AudioConverter::WAVFileIO::write(const char* buf, LONG buflen)
{
	if (m_hmmio) {
		return ::mmioWrite(m_hmmio, buf, buflen);
	}
	return -1;
}

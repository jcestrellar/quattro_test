//
//  AudioPlayer.cpp
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#include "AudioPlayer.h"

AudioPlayer::AudioPlayer()
{
	mp_delegate = 0;
	mp_output = 0;
	mp_deviceId = 0;

	mp_file = 0;
	mp_reader = 0;
	m_bufpos = 0;

	m_totalTime = 0;
	m_locateTime = 0;
}

AudioPlayer::~AudioPlayer()
{
	mp_delegate = 0;
	close();
	if (mp_output) {
		mp_output->delegate(0);
	}
	delete [] mp_deviceId;
}

void AudioPlayer::close()
{
	if (mp_output) {
		mp_output->stop();
	}

	closeFile();

	delete [] mp_file;
	mp_file = 0;
}

void AudioPlayer::closeFile()
{
	if (mp_reader) {
		mp_reader->Release();
		mp_reader = 0;
		m_buffer.resize(0);
	}

	m_totalTime = 0;
	m_locateTime = 0;
}

void AudioPlayer::output(AudioOutputStream* output)
{
	if (mp_output) {
		mp_output->stop();
	}

	mp_output = output;

	if (mp_output) {
		mp_output->delegate(this);
	}
}

void AudioPlayer::device(LPCTSTR deviceId)
{
	stop();

	delete [] mp_deviceId;
	if (deviceId) {
		mp_deviceId = new TCHAR[MAX_DEVICE_UID_LENGTH];
		_tcscpy_s(mp_deviceId, MAX_DEVICE_UID_LENGTH, deviceId);
	} else {
		mp_deviceId = 0;
	}
}

LPCTSTR AudioPlayer::device() const
{
	return mp_deviceId ? mp_deviceId : TEXT("");
}

void AudioPlayer::play()
{
	if (mp_reader && mp_output) {
		mp_output->start(mp_deviceId);
	}
}

void AudioPlayer::pause()
{
	if (mp_output) {
		mp_output->pause();
	}
}

void AudioPlayer::stop()
{
	if (mp_output) {
		mp_output->stop();
	}

	seek(0);
	m_locateTime = 0;

	if (mp_delegate) {
		delegate()->audioPlayerDidFinishPlaying(mp_file);
	}
}

void AudioPlayer::locate(float time)
{
	if (mp_output) {
		mp_output->stop();
	}

	if (seek(time)) {
		m_locateTime = time;
	}
}

void AudioPlayer::volume(float gain)
{
	if (gain < 0 || gain > 1.0)
		return;

	if (mp_output)
		mp_output->volume(gain);
}

float AudioPlayer::volume() const
{
	return mp_output ? mp_output->volume() : 0;
}

void AudioPlayer::speed(float rate)
{
	if (rate < 0.5 || rate > 2.0)
		return;

	if (mp_output)
		mp_output->speed(rate);
}

float AudioPlayer::speed() const
{
	return mp_output ? mp_output->speed() : 1.0f;
}

void AudioPlayer::pitch(float cent)
{
	if (cent < -2400 || cent > 2400)
		return;

	if (mp_output)
		mp_output->pitch(cent);
}

float AudioPlayer::pitch() const
{
	return mp_output ? mp_output->pitch() : 0;
}

int AudioPlayer::numberOfChannels() const
{
	return mp_output ? mp_output->numberOfChannels() : 0;
}

float AudioPlayer::peakPowerForChannel(int channelNumber) const
{
    if (channelNumber >= numberOfChannels())
        return -120.0f;

	return mp_output ? (mp_output->peakPowerForChannel(channelNumber)) : -120.0f;
}

float AudioPlayer::currentTime() const
{
	return (mp_output ? mp_output->currentTime() : 0) + m_locateTime;
}

float AudioPlayer::totalTime() const
{
	return m_totalTime;
}

int AudioPlayer::status() const
{
	return mp_output ? mp_output->status() : kAudioOutputStatusStop;
}

bool AudioPlayer::open(LPCTSTR file)
{
	close();

	HRESULT hr = mp_output ? S_OK : E_ABORT;

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateSourceReaderFromURL(file, NULL, &mp_reader);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_reader->SetStreamSelection((DWORD)MF_SOURCE_READER_ALL_STREAMS, FALSE);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_reader->SetStreamSelection((DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, TRUE);
	}
	if (SUCCEEDED(hr)) {
		const WAVEFORMATEX* pwfe = mp_output->format();
		CComPtr<IMFMediaType> media_type;
		hr = ::MFCreateMediaType(&media_type);
		if (SUCCEEDED(hr)) hr = media_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
		if (SUCCEEDED(hr)) hr = media_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_PCM);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, pwfe->wBitsPerSample);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, pwfe->nBlockAlign);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, pwfe->nAvgBytesPerSec);
		if (SUCCEEDED(hr)) hr = media_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
		if (SUCCEEDED(hr)) hr = mp_reader->SetCurrentMediaType((DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, NULL, media_type);
	}
	if (SUCCEEDED(hr)) {
		PROPVARIANT var;
		::PropVariantInit(&var);
		HRESULT hr = mp_reader->GetPresentationAttribute(
				(DWORD)MF_SOURCE_READER_MEDIASOURCE, MF_PD_DURATION, &var);
		if (SUCCEEDED(hr)) {
			m_totalTime = float((var.hVal.QuadPart / 10000000.0));
		}
		PropVariantClear(&var);
	}
	if (SUCCEEDED(hr)) {
		mp_file = new TCHAR[MAX_PATH];
		_tcscpy_s(mp_file, MAX_PATH, file);
	} else {
		closeFile();
	}

	return SUCCEEDED(hr);
}

bool AudioPlayer::seek(float time)
{
	HRESULT hr = mp_reader ? S_OK : E_ABORT;
	if (SUCCEEDED(hr)) {
		PROPVARIANT var;
		hr = ::InitPropVariantFromInt64(LONGLONG(time * 10000000), &var);
		if (SUCCEEDED(hr)) {
			hr = mp_reader->SetCurrentPosition(GUID_NULL, var);
			::PropVariantClear(&var);
		}
		m_buffer.resize(0);
	}
	return SUCCEEDED(hr);
}

int AudioPlayer::read(BYTE* buffer, int length)
{
	BYTE* p = buffer;

	while (length > 0) {
		if (m_buffer.size() > 0) {
			int size = (int)m_buffer.size() - m_bufpos;
			if (size > length) { size = length; }
			memcpy(p, m_buffer.data() + m_bufpos, size);
			p += size; length -= size; m_bufpos += size;
			if (m_bufpos == m_buffer.size()) {
				m_buffer.resize(0);
			}
			continue;
		}

		DWORD dwFlags = 0;
		CComPtr<IMFSample> sample;
		CComPtr<IMFMediaBuffer> mediaBuffer;
		HRESULT hr = mp_reader->ReadSample(
				(DWORD)MF_SOURCE_READER_FIRST_AUDIO_STREAM, 0, NULL, &dwFlags, NULL, &sample);
		if (FAILED(hr)) { return -1; }
		if (dwFlags & MF_SOURCE_READERF_CURRENTMEDIATYPECHANGED) { return -1; }
		if (dwFlags & MF_SOURCE_READERF_ENDOFSTREAM) { break; }
		if (sample == 0) { continue; }
		hr = sample->ConvertToContiguousBuffer(&mediaBuffer);
		if (FAILED(hr)) { return -1; }

		BYTE* buf;
		DWORD len;
		hr = mediaBuffer->Lock(&buf, NULL, &len);
		if (FAILED(hr)) { return -1; }
		m_bufpos = 0;
		m_buffer.resize(len);
		memcpy(m_buffer.data(), buf, len);
		hr = mediaBuffer->Unlock();
		if (FAILED(hr)) { return -1; }
	}

	return (int)(p - buffer);
}

int AudioPlayer::outputStream(BYTE* buffer, int length)
{
	int n = read(buffer, length);

	if (n < 0) {
		stop();
		if (mp_delegate) {
			delegate()->audioPlayerErrorDidOccur(mp_file);
		}
		return 0;
	}
	if (n == 0) {
		stop();
		if (mp_delegate) {
			delegate()->audioPlayerDidEndSong(mp_file);
		}
		return 0;
	}

	memset(buffer + n, 0, length - n);
	return length;
}

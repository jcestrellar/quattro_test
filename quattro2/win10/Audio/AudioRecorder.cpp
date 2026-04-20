//
//  AudioRecorder.m
//
//  Copyright 2014 Roland Corporation. All rights reserved.
//

#include "AudioRecorder.h"

AudioRecorder::AudioRecorder()
{
	mp_delegate = 0;
	mp_input = 0;
	mp_deviceId = 0;

	mp_file = 0;
	mp_writer = 0;
	m_streamIndex = 0;
	m_frames = 0;
}

AudioRecorder::~AudioRecorder()
{
	mp_delegate = 0;
	close();
	if (mp_input) {
		mp_input->delegate(0);
	}
	delete [] mp_deviceId;
}

void AudioRecorder::close()
{
	closeFile();

	if (mp_input) {
		mp_input->stop(true);
	}

	delete [] mp_file;
	mp_file = 0;
}

void AudioRecorder::closeFile()
{
	if (mp_writer) {
		mp_writer->Finalize();
		mp_writer->Release();
		mp_writer = 0;
	}
}

void AudioRecorder::input(AudioInputStream* input)
{
	if (mp_input) {
		mp_input->stop(true);
	}

	mp_input = input;

	if (mp_input) {
		mp_input->delegate(this);
	}
}

void AudioRecorder::device(LPCTSTR deviceId)
{
	stop(false);

	delete [] mp_deviceId;
	if (deviceId) {
		mp_deviceId = new TCHAR[MAX_DEVICE_UID_LENGTH];
		_tcscpy_s(mp_deviceId, MAX_DEVICE_UID_LENGTH, deviceId);
	} else {
		mp_deviceId = 0;
	}
}

LPCTSTR AudioRecorder::device() const
{
	return mp_deviceId ? mp_deviceId : TEXT("");
}

void AudioRecorder::record()
{
	if (mp_input) {
		mp_input->start(mp_deviceId);
	}
}

void AudioRecorder::pause()
{
	if (mp_input) {
		mp_input->pause();
	}
}

void AudioRecorder::stop(bool shouldStopImmediate)
{
	if (mp_input) {
		mp_input->stop(shouldStopImmediate);
	}

	if (shouldStopImmediate) {
		inputStreamDidClosed();
	}
}

void  AudioRecorder::volume(float gain)
{
	if (gain < 0 || gain > 1.0)
		return;

	if (mp_input)
		mp_input->volume(gain);
}

float AudioRecorder::volume()
{
	return mp_input ? mp_input->volume() : 0;
}

int AudioRecorder::numberOfChannels()
{
	return mp_input ? mp_input->numberOfChannels() : 0;
}

float AudioRecorder::peakPowerForChannel(int channelNumber)
{
    if (channelNumber >= numberOfChannels())
        return -120.0f;

    return mp_input ? mp_input->peakPowerForChannel(channelNumber) : -120.0f;
}

float AudioRecorder::currentTime()
{
	return (mp_input && mp_writer) ? mp_input->currentTime() : 0;
}

int AudioRecorder::status()
{
	return mp_input ? mp_input->status() : kAudioInputStatusStop;
}

bool AudioRecorder::create(LPCTSTR file, enum RecordingFormat format)
{
	close();

	const WAVEFORMATEX* pwfe = mp_input->format();

	CComPtr<IMFMediaType> in_type;
	CComPtr<IMFMediaType> out_type;

	HRESULT hr = mp_input ? S_OK : S_FALSE;

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateMediaType(&in_type);
	}
	if (SUCCEEDED(hr)) {
		if (SUCCEEDED(hr)) hr = in_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
		if (SUCCEEDED(hr)) hr = in_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_PCM);
		if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
		if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
		if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, pwfe->wBitsPerSample);
		if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, pwfe->nBlockAlign);
		if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, pwfe->nAvgBytesPerSec);
		if (SUCCEEDED(hr)) hr = in_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
	}
	if (SUCCEEDED(hr)) {
		hr = ::MFCreateMediaType(&out_type);
	}
	if (SUCCEEDED(hr)) {
		if (format == kRecordingFormatWAV) {
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_PCM);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, pwfe->wBitsPerSample);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, pwfe->nBlockAlign);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, pwfe->nAvgBytesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE);
		} else {
			UINT32 bitrate;
			switch (format) {
				case kRecordingFormatAAC_256K: bitrate = 256000; break;
				case kRecordingFormatAAC_192K: bitrate = 192000; break;
				case kRecordingFormatAAC_128K: bitrate = 128000; break;
				case kRecordingFormatAAC_64K:  bitrate =  64000; break;
				default:
					hr = S_FALSE;
					break;
			}
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
			if (SUCCEEDED(hr)) hr = out_type->SetGUID(MF_MT_SUBTYPE, MFAudioFormat_AAC);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, pwfe->nChannels);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, pwfe->nSamplesPerSec);
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, 16); /* fixed */
			if (SUCCEEDED(hr)) hr = out_type->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, bitrate / 8);
		}
	}

	m_streamIndex = 0;
	m_frames = 0;

	if (SUCCEEDED(hr)) {
		hr = ::MFCreateSinkWriterFromURL(file, NULL, NULL, &mp_writer);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_writer->AddStream(out_type, &m_streamIndex);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_writer->SetInputMediaType(m_streamIndex, in_type, NULL);
	}
	if (SUCCEEDED(hr)) {
		hr = mp_writer->BeginWriting();
	}
	if (SUCCEEDED(hr)) {
		mp_file = new TCHAR[MAX_PATH];
		_tcscpy_s(mp_file, MAX_PATH, file);
	} else if (mp_writer) {
		mp_writer->Release();
		mp_writer = 0;
		::DeleteFile(file);
	}

	return SUCCEEDED(hr);
}

void AudioRecorder::write(const BYTE* buffer, int length)
{
	HRESULT hr = S_OK;

	CComPtr<IMFMediaBuffer> mediaBuffer;
	if (SUCCEEDED(hr)) {
		hr = ::MFCreateMemoryBuffer(length, &mediaBuffer);
	}
	if (SUCCEEDED(hr)) {
		BYTE* p;
		hr = mediaBuffer->Lock(&p, NULL, NULL);
		if (SUCCEEDED(hr)) {
			memcpy(p, buffer, length);
			hr = mediaBuffer->Unlock();
			if (SUCCEEDED(hr)) {
				mediaBuffer->SetCurrentLength(length);
			}
		}
	}

	CComPtr<IMFSample> sample;
	if (SUCCEEDED(hr)) {
		hr = ::MFCreateSample(&sample);
	}
	if (SUCCEEDED(hr)) {
		hr = sample->AddBuffer(mediaBuffer);
	}
	if (SUCCEEDED(hr)) {
		const WAVEFORMATEX* pwfe = mp_input->format();
		LONGLONG frames = (length / pwfe->nBlockAlign);
		LONGLONG time = LONGLONG(m_frames * 10000000 / pwfe->nSamplesPerSec);
		LONGLONG duration = LONGLONG(frames * 10000000 / pwfe->nSamplesPerSec);
		sample->SetSampleTime(time);
		sample->SetSampleDuration(duration);
		m_frames += frames;
	}
	if (SUCCEEDED(hr)) {
		hr = mp_writer->WriteSample(m_streamIndex, sample);
	}

	if (FAILED(hr)) {
		if (mp_file && mp_delegate) {
			delegate()->audioRecorderErrorDidOccur(mp_file);
		}
		stop(true);
	}
}

void AudioRecorder::inputStream(const BYTE* buffer, int length)
{
	if (mp_writer) {
		write(buffer, length);
	}
}

void AudioRecorder::inputStreamDidClosed()
{
	closeFile();

	if (mp_file && mp_delegate) {
		delegate()->audioRecorderDidFinishRecording(mp_file);
	}

	delete [] mp_file;
	mp_file = 0;
}

//
// @(#)AudioInputUnit.cpp
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#include "AudioInputUnit.h"

#define kSampleRate			(44100.0f)
#define kNumOfChannels		(2)
#define kBytesPerFrame		(sizeof(INT16) * kNumOfChannels)
#define kBufferSize			(1024 * kBytesPerFrame)

AudioInputUnit::AudioInputUnit() : m_power(0)
{
	mp_delegate = 0;

	m_started = m_recording = false;
	m_currentFrame = 0;
	m_gain = 1.0;

	m_power.config(kSampleRate);

	m_win = NULL;
	for (int i = 0; i < WIN_BUF_NUM; i++) {
		mp_wavbuf[i] = new BYTE [kBufferSize];
	}

	memset(&m_wfe, 0, sizeof(m_wfe));
	m_wfe.wFormatTag      = WAVE_FORMAT_PCM;
	m_wfe.nSamplesPerSec  = (DWORD)kSampleRate;
	m_wfe.nChannels       = kNumOfChannels;
	m_wfe.wBitsPerSample  = (kBytesPerFrame / kNumOfChannels) * 8;
	m_wfe.nBlockAlign     = kBytesPerFrame;
	m_wfe.nAvgBytesPerSec = kBytesPerFrame * m_wfe.nSamplesPerSec;

	m_thread = NULL;
	m_tid = 0;
}

AudioInputUnit::~AudioInputUnit()
{
	stop(true);

	for (int i = 0; i < WIN_BUF_NUM; i++) {
		delete [] mp_wavbuf[i];
	}
}

void AudioInputUnit::writeBuffer(BYTE* buf, int len)
{
	int frames = len / kBytesPerFrame;

	float gain = AudioVolume::convert(m_gain);

	INT16* p = (INT16*)buf;
	for (int i = 0; i < frames; i++) {
		INT16* dataL = p++;
		INT16* dataR = p++;
		float L = (*dataL) * gain;
		float R = (*dataR) * gain;
		*dataL = (INT16)L;
		*dataR = (INT16)R;
		m_power.set(0, L);
		m_power.set(1, R);
	}

	m_power.update(frames);

	m_currentFrame += frames;

	if (mp_delegate) {
		delegate()->inputStream(buf, len);
	}
}

static DWORD WINAPI _thread(LPVOID param)
{
	AudioInputUnit* _this = (AudioInputUnit*)param;

	_this->run();

	return 0;
}

void AudioInputUnit::run()
{
	MSG msg;
	while (GetMessage(&msg, NULL, 0, 0)) {
		switch (msg.message) {
		case MM_WIM_CLOSE:
			break;
		case MM_WIM_DATA:
			if (msg.lParam != 0) {
				WAVEHDR* pwh = (WAVEHDR*)msg.lParam;
				if (pwh->dwFlags & WHDR_PREPARED) {
					::waveInUnprepareHeader(m_win, pwh, sizeof(WAVEHDR));
					writeBuffer((BYTE*)pwh->lpData, pwh->dwBufferLength);
					::waveInPrepareHeader(m_win, pwh, sizeof(WAVEHDR));
					::waveInAddBuffer(m_win, pwh, sizeof(WAVEHDR));
				}
			}
			break;
		}
	}

	::waveInStop(m_win);
	do ::waveInReset(m_win);
	while (::waveInClose(m_win) == WAVERR_STILLPLAYING);
	::waveInClose(m_win);

	m_win = NULL;

	m_currentFrame = 0;
	m_power.clear();
}

void AudioInputUnit::start(LPCTSTR deviceId)
{
	if (m_started && !m_recording) {
		::waveInStart(m_win);
		m_recording = true;
		return;
	}

	if (!m_started) {

		if (m_thread) {
			::WaitForSingleObject(m_thread, INFINITE);
			::CloseHandle(m_thread);
		}

		m_thread = ::CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)_thread, (void*)this, 0, &m_tid);
		if (!m_thread) return;
		::SetThreadPriority(m_thread, THREAD_PRIORITY_TIME_CRITICAL);

		UINT id = AudioDevice::mmioID(AudioDevice::INPUT, deviceId);
		MMRESULT result = ::waveInOpen(&m_win, id, format(), (DWORD_PTR)m_tid, NULL, CALLBACK_THREAD);
		if (result != MMSYSERR_NOERROR) {
			::PostThreadMessage(m_tid, WM_QUIT, 0, 0);
			m_win = NULL;
			return;
		}

		m_started = true;
		m_recording = true;

		::waveInReset(m_win);

		memset(m_whdr, 0, sizeof(m_whdr));
		for (int i = 0; i < WIN_BUF_NUM; i++) {
			m_whdr[i].lpData = (LPSTR)mp_wavbuf[i];
			m_whdr[i].dwBufferLength = kBufferSize;
			::waveInPrepareHeader(m_win, &m_whdr[i], sizeof(WAVEHDR));
			::waveInAddBuffer(m_win, &m_whdr[i], sizeof(WAVEHDR));
		}

		::waveInStart(m_win);
	}
}

void AudioInputUnit::pause()
{
	if (m_started && m_recording) {
		::waveInStop(m_win);
		m_recording = false;
	}
}

void AudioInputUnit::stop(bool shouldStopImmediate)
{
	if (m_started) {
		::PostThreadMessage(m_tid, WM_QUIT, 0, 0);
		if (::GetCurrentThreadId() != m_tid) {
			::WaitForSingleObject(m_thread, INFINITE);
			::CloseHandle(m_thread);
			m_thread = NULL;
		}
	}

	m_started = false;
	m_recording = false;

	if (!shouldStopImmediate && mp_delegate) {
		mp_delegate->inputStreamDidClosed();
	}
}

int AudioInputUnit::status() const
{
	if (m_recording)
		return kAudioInputStatusStart;
	else if (m_started)
		return kAudioInputStatusPause;
	return kAudioInputStatusStop;
}

float AudioInputUnit::currentTime() const
{
	return (float)(m_currentFrame / kSampleRate);
}

int AudioInputUnit::numberOfChannels() const
{
	return kNumOfChannels;
}

float AudioInputUnit::peakPowerForChannel(int channelNumber) const
{
	float peakPower = -120.0;

	if (0 <= channelNumber && channelNumber < kNumOfChannels) {
		if (m_recording) {
			float x = m_power.get(channelNumber) / 32768.0f;
			if (x != 0) {
				peakPower = (float)(20 * log10(x));
				if (peakPower < -120.0)
					peakPower = -120.0;
			}
		}
	}

	return peakPower;
}

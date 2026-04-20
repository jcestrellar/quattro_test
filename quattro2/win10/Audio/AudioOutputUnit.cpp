//
// @(#)AudioOutputUnit.cpp
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#include "AudioOutputUnit.h"

#define kSampleRate			(44100.0f)
#define kNumOfChannels		(2)
#define kBytesPerFrame		(sizeof(INT16) * kNumOfChannels)
#define kBufferSize			(1024 * kBytesPerFrame)
#define kNumOfRMS			((int)kSampleRate / 1024)

AudioOutputUnit::AudioOutputUnit() : m_power(WOUT_BUF_NUM)
{
	mp_delegate = 0;

	m_started = m_playing = false;
	m_currentFrame = 0;
	m_gain = 1.0;

	m_power.config(kSampleRate);

	m_wout = NULL;
	for (int i = 0; i < WOUT_BUF_NUM; i++) {
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

AudioOutputUnit::~AudioOutputUnit()
{
	stop();

	for (int i = 0; i < WOUT_BUF_NUM; i++) {
		delete [] mp_wavbuf[i];
	}
}

void AudioOutputUnit::readBuffer(BYTE* buf, int len)
{
	int frames = 0;

	if (mp_delegate) {
		frames = mp_delegate->outputStream(buf, len) / kBytesPerFrame;
	}

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

	m_power.update(len / kBytesPerFrame);

	m_currentFrame += frames;
}

static DWORD WINAPI _thread(LPVOID param)
{
	AudioOutputUnit* _this = (AudioOutputUnit*)param;

	_this->run();

	return 0;
}

void AudioOutputUnit::run()
{
	MSG msg;
	while (GetMessage(&msg, NULL, 0, 0)) {
		switch (msg.message) {
		case MM_WOM_CLOSE:
			break;
		case MM_WOM_DONE:
			if (msg.lParam) {
				WAVEHDR* pwh = (WAVEHDR*)msg.lParam;
				if (pwh->dwFlags & WHDR_PREPARED) {
					::waveOutUnprepareHeader(m_wout, pwh, sizeof(WAVEHDR));
					readBuffer((BYTE *)pwh->lpData, pwh->dwBufferLength);
					::waveOutPrepareHeader(m_wout, pwh, sizeof(WAVEHDR));
					::waveOutWrite(m_wout, pwh, sizeof(WAVEHDR));
				}
			}
			break;
		}
	}

	::waveOutReset(m_wout);

	for (int i = 0; i < WOUT_BUF_NUM; i++) {
		if (m_whdr[i].dwFlags & WHDR_PREPARED) {
			::waveOutUnprepareHeader(m_wout, &m_whdr[i], sizeof(WAVEHDR));
		}
	}

	do ::waveOutReset(m_wout);
	while (::waveOutClose(m_wout) == WAVERR_STILLPLAYING);

	m_wout = NULL;

	m_currentFrame = 0;
	m_power.clear();
}

void AudioOutputUnit::start(LPCTSTR deviceId)
{
	if (m_started && !m_playing) {
		::waveOutRestart(m_wout);
		m_playing = true;
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

		UINT id = AudioDevice::mmioID(AudioDevice::OUTPUT, deviceId);
		MMRESULT result = ::waveOutOpen(&m_wout, id, format(), (DWORD_PTR)m_tid, NULL, CALLBACK_THREAD);
		if (result != MMSYSERR_NOERROR) {
			::PostThreadMessage(m_tid, WM_QUIT, 0, 0);
			m_wout = NULL;
			return;
		}

		m_started = true;
		m_playing = true;

		memset(m_whdr, 0, sizeof(m_whdr));
		for (int i = 0; i < WOUT_BUF_NUM; i++) {
			memset(mp_wavbuf[i], 0, kBufferSize);
			m_whdr[i].lpData = (LPSTR)mp_wavbuf[i];
			m_whdr[i].dwBufferLength = kBufferSize;
		}

		for (int i = 0; i < WOUT_BUF_NUM; i++) {
			readBuffer(mp_wavbuf[i], kBufferSize);
			::waveOutPrepareHeader(m_wout, &m_whdr[i], sizeof(WAVEHDR));
			::waveOutWrite(m_wout, &m_whdr[i], sizeof(WAVEHDR));
		}
	}
}

void AudioOutputUnit::pause()
{
	if (m_started && m_playing) {
		::waveOutPause(m_wout);
		m_playing = false;
	}
}

void AudioOutputUnit::stop()
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
	m_playing = false;
}

int AudioOutputUnit::status() const
{
	if (m_playing)
		return kAudioOutputStatusStart;
	else if (m_started)
		return kAudioOutputStatusPause;
	return kAudioOutputStatusStop;
}

float AudioOutputUnit::currentTime() const
{
	return (float)(m_currentFrame / kSampleRate);
}

int AudioOutputUnit::numberOfChannels() const
{
	return kNumOfChannels;
}

float AudioOutputUnit::peakPowerForChannel(int channelNumber) const
{
	float peakPower = -120.0;

	if (0 <= channelNumber && channelNumber < kNumOfChannels) {
		if (m_playing) {
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

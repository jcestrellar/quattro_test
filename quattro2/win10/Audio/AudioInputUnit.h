//
// @(#)AudioInputUnitUnit.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __AUDIO_INPUT_UNIT_H__
#define __AUDIO_INPUT_UNIT_H__

#include <windows.h>
#include <mmsystem.h>
#include "AudioInputStream.h"
#include "AudioDevice.h"
#include "AudioVolume.h"

class AudioInputUnit : public AudioInputStream
{
  public:
	AudioInputUnit();
	virtual ~AudioInputUnit();

	/* AudioInputStream */
	void delegate(AudioInputStreamDelegate* obj);
	AudioInputStreamDelegate* delegate() const;

	const WAVEFORMATEX* format();

	void start(LPCTSTR deviceId);
	void pause();
	void stop(bool shouldStopImmediate);

	void volume(float gain);
	float volume() const;

	int numberOfChannels() const;

	float peakPowerForChannel(int channelNumber) const;
	float currentTime() const;
	int status() const;

	void run();

  private:
	AudioInputStreamDelegate* mp_delegate;

	bool m_started;
	bool m_recording;
	float m_gain;
	DWORD m_currentFrame;

	RMSAvaragePower m_power;

	enum { WIN_BUF_NUM = 4 };

	WAVEFORMATEX m_wfe;
	HWAVEIN m_win;
	WAVEHDR m_whdr[WIN_BUF_NUM];
	BYTE* mp_wavbuf[WIN_BUF_NUM];
	HANDLE m_thread;
	DWORD m_tid;

	void writeBuffer(BYTE* buf, int len);
};

inline void AudioInputUnit::delegate (AudioInputStreamDelegate* obj)
	{ mp_delegate = obj; }
inline AudioInputStreamDelegate* AudioInputUnit::delegate() const
	{ return mp_delegate; }

inline const WAVEFORMATEX* AudioInputUnit::format()
	{ return &m_wfe; }

inline void AudioInputUnit::volume(float gain)
	{ m_gain = gain; }
inline float AudioInputUnit::volume() const
	{ return m_gain; }

#endif /* __AUDIO_INPUT_UNIT_H__ */

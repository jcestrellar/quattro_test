//
// @(#)AudioOutputUnit.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __AUDIO_OUTPUT_UNIT_H__
#define __AUDIO_OUTPUT_UNIT_H__

#include <windows.h>
#include <mmsystem.h>
#include "AudioOutputStream.h"
#include "AudioDevice.h"
#include "AudioVolume.h"

class AudioOutputUnit : public AudioOutputStream
{
  public:
	AudioOutputUnit();
	virtual ~AudioOutputUnit();

	/* AudioOutputStream */
	void delegate(AudioOutputStreamDelegate* obj);
	AudioOutputStreamDelegate* delegate() const;

	const WAVEFORMATEX* format();

	void start(LPCTSTR deviceId);
	void pause();
	void stop();

	void volume(float gain); 
	float volume() const; 

	void speed(float rate);
	float speed() const;

	void pitch(float cent);
	float pitch() const;

	int numberOfChannels() const;

	float peakPowerForChannel(int channelNumber) const;
	float currentTime() const;
	int status() const;

	void run();

  private:
	AudioOutputStreamDelegate* mp_delegate;

	bool m_started;
	bool m_playing;
	float m_gain;
	DWORD m_currentFrame;
	HANDLE m_thread;
	DWORD m_tid;

	RMSAvaragePower m_power;

	enum { WOUT_BUF_NUM = 4 };

	WAVEFORMATEX m_wfe;
	HWAVEOUT m_wout;
	WAVEHDR m_whdr[WOUT_BUF_NUM];
	BYTE* mp_wavbuf[WOUT_BUF_NUM];
	void readBuffer(BYTE* buf, int len);
};

inline void AudioOutputUnit::delegate(AudioOutputStreamDelegate* obj)
	{ mp_delegate = obj; }
inline AudioOutputStreamDelegate* AudioOutputUnit::delegate() const
	{ return mp_delegate; }

inline const WAVEFORMATEX* AudioOutputUnit::format()
	{ return &m_wfe; }

inline void AudioOutputUnit::volume(float gain)
	{ m_gain = gain; }
inline float AudioOutputUnit::volume() const
	{ return m_gain; }
inline void AudioOutputUnit::speed(float rate)
	{ /* not supported */ }
inline float AudioOutputUnit::speed() const
	{ return 1.0f; /* not supported */ }
inline void AudioOutputUnit::pitch(float cent)
	{ /* not supported */ }
inline float AudioOutputUnit::pitch() const
	{ return 0; /* not supported */ }

#endif /* __AUDIO_OUTPUT_UNIT_H__ */

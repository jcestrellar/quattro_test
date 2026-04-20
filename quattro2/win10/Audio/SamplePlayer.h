//
// @(#)SamplePlayer.h
//
// Copyright 2022 Roland Corporation. All rights reserved.
//

#ifndef __SAMPLE_PLAYER_H__
#define __SAMPLE_PLAYER_H__

//#define OLD_MME_SAMPLER

#include <windows.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <propvarutil.h>
#include <atlbase.h>
#include <vector>
#include "AudioDevice.h"
#include "AudioVolume.h"
#ifdef OLD_MME_SAMPLER
#include <mmsystem.h>
#endif
#include "../Common/Thread.h"

enum {
	kSamplePlayerStateStop,
	kSamplePlayerStateStopping,
	kSamplePlayerStatePlay,
	kSamplePlayerStatePause
};

class SamplePlayerDelegate
{
  public:
	virtual ~SamplePlayerDelegate() { }

	/* @optional */
	virtual void samplePlayerDidEndSong(LPCTSTR file) { }
};

class SamplePlayer : public AudioDeviceDelegate
{
  public:
	SamplePlayer();
	virtual ~SamplePlayer();

	void delegate(SamplePlayerDelegate* obj);
	SamplePlayerDelegate* delegate() const;

	void device(LPCTSTR deviceId);
	LPCTSTR device() const;

	bool open(LPCTSTR file);
	void close();

	void play();
	void pause();
	void stop(bool immediate = false);

	void locate(float time);

	void begin(float time);
	float begin() const;
	void end(float time);
	float end() const;

	void volume(float gain);
	float volume() const;

	void repeat(int count);
	int repeat() const;

	void fadeIn(float time);
	float fadeIn() const;
	void fadeOut(float time);
	float fadeOut() const;

	virtual void speed(float rate);
	virtual float speed() const;
	virtual void pitch(float cent);
	virtual float pitch() const;

	virtual CStringW control(LPCWSTR params);

	LPCTSTR file() const;
	float totalTime() const;
	float currentTime() const;
	int state() const;
	std::vector<float> peakPowerForChannels() const;

	void run();

  protected:
	int read(BYTE* buf, int len);

	virtual void init(const WAVEFORMATEX* pwfe) {}
	virtual void term() {}
	virtual void reset() {}
	virtual bool ready() { return true; }
	virtual int render(BYTE* buffer, int length) { return 0; }

  private:
	SamplePlayerDelegate* mp_delegate;

	IMFSourceReader* mp_reader;
	std::vector<BYTE> m_buffer;
	int m_bufpos;

	LPTSTR mp_deviceId;
	LPTSTR mp_file;
	float m_totalTime;
	float m_currentTime;
	DWORD m_currentFrame;

	float m_locateTime;
	float m_beginTime;
	float m_endTime;

	bool m_trigger;
	bool m_playing;
	bool m_paused;
	DWORD m_fadeOutStartFrame;
	bool m_immediate;
	bool m_bos;

	int m_repeat;
	int m_count;

	float m_gain;
	float m_rate;
	float m_cent;
	float m_fadeIn;
	float m_fadeOut;

	float __gain;

	AudioDevice* mp_audio;

	WAVEFORMATEX m_wfe;
#ifdef OLD_MME_SAMPLER
	enum { WOUT_BUF_NUM = 4, WOUT_RENDER_PERIOD = 20 /* msec */ };

	HWAVEOUT m_wout;
	WAVEHDR m_whdr[WOUT_BUF_NUM];
	BYTE* mp_wavbuf[WOUT_BUF_NUM];
#else
	IMMDeviceEnumerator* mp_enumerator = 0;
	IMMDevice* mp_device = 0;
	IAudioClient* mp_client = 0;
	IAudioRenderClient* mp_render = 0;
	HANDLE m_event = NULL;
	bool m_runloop = false;

	UINT32 m_bufferFrames = 256;
	void releaseOutput();
#endif

	HANDLE m_thread;
	DWORD m_tid;

	RMSAvaragePower m_power;

	bool seek(float time);

	int process(BYTE* buffer, int length);
	float fader();
	float envelope(BYTE* buffer, int length, float coef0, float coef1);
	void stopped(bool eos = false);

	void closeFile();

	bool startOutput();
	void closeOutput();

	/* AudioDeviceDelegate */
	void audioObjectDefaultChanged(EDataFlow flow, ERole role, LPCWSTR pwstrDeviceId);
	void audioObjectAddedRemoved(LPCWSTR pwstrDeviceId, DWORD dwNewState);
};

inline void SamplePlayer::delegate(SamplePlayerDelegate* obj)
	{ mp_delegate = obj; }
inline SamplePlayerDelegate* SamplePlayer::delegate() const
	{ return mp_delegate; }

inline LPCTSTR SamplePlayer::device() const
	{ return mp_deviceId ? mp_deviceId : TEXT(""); }

inline LPCTSTR SamplePlayer::file() const
	{ return mp_file; }
inline float SamplePlayer::totalTime() const
	{ return m_totalTime; }
inline float SamplePlayer::currentTime() const
	{ return m_currentTime; }

inline float SamplePlayer::begin() const
	{ return m_beginTime; }
inline float SamplePlayer::end() const
	{ return m_endTime; }

inline void SamplePlayer::volume(float gain)
{
	if (0 <= gain && gain <= 1.0f) {
		m_gain = gain;
	}
}
inline float SamplePlayer::volume() const
	{ return m_gain; }

inline void SamplePlayer::repeat(int count)
{
	if (count >= -1) {
		m_repeat = m_count = count;
	}
}
inline int SamplePlayer::repeat() const
	{ return m_repeat; }

inline void SamplePlayer::speed(float rate)
	{ m_rate = rate; }
inline float SamplePlayer::speed() const
	{ return m_rate; }

inline void SamplePlayer::pitch(float cent)
	{ m_cent = cent; }
inline float SamplePlayer::pitch() const
	{ return m_cent; }

inline void SamplePlayer::fadeIn(float time)
{
	if (time >= 0) {
		m_fadeIn = time;
	}
}
inline float SamplePlayer::fadeIn() const
	{ return m_fadeIn; }

inline void SamplePlayer::fadeOut(float time)
{
	if (time >= 0) {
		m_fadeOut = time;
	}
}
inline float SamplePlayer::fadeOut() const
	{ return m_fadeOut; }

inline CStringW SamplePlayer::control(LPCWSTR params)
	{ return L""; }

#endif /* __SAMPLE_PLAYER_H__ */

//
// @(#)AudioPlayer.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __AUDIO_PLAYER_H__
#define __AUDIO_PLAYER_H__

#include <windows.h>
#include <mmsystem.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <propvarutil.h>
#include <atlbase.h>
#include <vector>
#include "AudioOutputStream.h"
#include "AudioDevice.h"

class AudioPlayerDelegate
{
  public:
	virtual ~AudioPlayerDelegate() { }

	/* @optional */
	virtual void audioPlayerDidEndSong(LPCTSTR file) { }
	virtual void audioPlayerDidFinishPlaying(LPCTSTR file) { }
	virtual void audioPlayerErrorDidOccur(LPCTSTR file) { }
};

class AudioPlayer : public AudioOutputStreamDelegate
{
  public:
	AudioPlayer();
	virtual ~AudioPlayer();

	void delegate(AudioPlayerDelegate* obj);
	AudioPlayerDelegate* delegate() const;

	void output(AudioOutputStream* output);
	AudioOutputStream* output() const;

	void device(LPCTSTR deviceId);
	LPCTSTR device() const;

	bool open(LPCTSTR file);
	void close();

	void play();
	void pause();
	void stop();

	void locate(float time);

	void volume(float gain);
	float volume() const;

	void speed(float rate);
	float speed() const;

	void pitch(float cent);
	float pitch() const;

	LPCTSTR file() const;
	int status() const;
	int numberOfChannels() const;
	float peakPowerForChannel(int channelNumber) const;
	float currentTime() const;
	float totalTime() const;

	/* AudioOutputStreamDelegate */
	int outputStream(BYTE* buffer, int length);

  private:
	AudioPlayerDelegate* mp_delegate;
	AudioOutputStream* mp_output;
	LPTSTR mp_deviceId;

	IMFSourceReader* mp_reader;
	std::vector<BYTE> m_buffer;
	int m_bufpos;

	LPTSTR mp_file;
	float m_totalTime;
	float m_locateTime;

	bool seek(float time);
	int read(BYTE* buf, int len);
	void closeFile();
};

inline void AudioPlayer::delegate(AudioPlayerDelegate* obj)
	{ mp_delegate = obj; }
inline AudioPlayerDelegate* AudioPlayer::delegate() const
	{ return mp_delegate; }

inline AudioOutputStream* AudioPlayer::output() const
	{ return mp_output; }

inline LPCTSTR AudioPlayer::file() const
	{ return mp_file; }

#endif /* __AUDIO_PLAYER_H__ */

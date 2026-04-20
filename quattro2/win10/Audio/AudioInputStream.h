//
// @(#)AudioInputStream.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __AUDIO_INPUT_STREAM_H__
#define __AUDIO_INPUT_STREAM_H__

enum {
	kAudioInputStatusStop,
	kAudioInputStatusStart,
	kAudioInputStatusPause
};

class AudioInputStreamDelegate
{
  public:
	virtual ~AudioInputStreamDelegate() { }

	/* @required */
	virtual void inputStream(const BYTE* buffer, int length) = 0;
	virtual void inputStreamDidClosed() = 0;
};

class AudioInputStream
{
  public:
	virtual ~AudioInputStream() { }

	/* @required */
	virtual void delegate(AudioInputStreamDelegate* obj) = 0;
	virtual AudioInputStreamDelegate* delegate() const = 0;

	virtual const WAVEFORMATEX* format() = 0;

	virtual void start(LPCTSTR deviceId) = 0;
	virtual void pause() = 0;
	virtual void stop(bool shouldStopImmediate) = 0;

	virtual void volume(float gain) = 0;
	virtual float volume() const = 0;

	virtual int numberOfChannels() const = 0;

	virtual float peakPowerForChannel(int channelNumber) const = 0;
	virtual float currentTime() const = 0;
	virtual int status() const = 0;
};

#endif /* __AUDIO_INPUT_STREAM_H__ */

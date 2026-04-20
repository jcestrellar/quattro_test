//
// @(#)AudioOutputStream.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __AUDIO_OUTPUT_STREAM_H__
#define __AUDIO_OUTPUT_STREAM_H__

enum {
	kAudioOutputStatusStop,
	kAudioOutputStatusStart,
	kAudioOutputStatusPause
};

class AudioOutputStreamDelegate
{
  public:
	virtual ~AudioOutputStreamDelegate() { }

	/* @required */
	virtual int outputStream(BYTE* buffer, int length) = 0;
};

class AudioOutputStream
{
  public:
	virtual ~AudioOutputStream() { }

	/* @required */
	virtual void delegate(AudioOutputStreamDelegate* obj) = 0;
	virtual AudioOutputStreamDelegate* delegate() const  = 0;

	virtual const WAVEFORMATEX* format() = 0;

	virtual void start(LPCTSTR deviceId) = 0;
	virtual void pause() = 0;
	virtual void stop() = 0;

	virtual void volume(float gain) = 0;
	virtual float volume() const = 0;
	 
	virtual void speed(float rate) = 0;
	virtual float speed() const = 0;

	virtual void pitch(float cent) = 0;
	virtual float pitch() const = 0;

	virtual int numberOfChannels() const = 0;

	virtual float peakPowerForChannel(int channelNumber) const = 0;
	virtual float currentTime() const = 0;
	virtual int status() const = 0;
};

#endif /* __AUDIO_OUTPUT_STREAM_H__ */

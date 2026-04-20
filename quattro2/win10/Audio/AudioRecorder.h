//
//  AudioRecorder.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#ifndef __AUDIO_RECORDER_H__
#define __AUDIO_RECORDER_H__

#include <windows.h>
#include <mmsystem.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <atlbase.h>
#include "AudioInputStream.h"
#include "AudioDevice.h"

enum RecordingFormat {
    kRecordingFormatAAC_256K, /* Not Supported */
    kRecordingFormatAAC_192K,
    kRecordingFormatAAC_128K,
    kRecordingFormatAAC_64K,  /* Not Supported */ 
    kRecordingFormatWAV
};

class AudioRecorderDelegate
{
  public:
	virtual ~AudioRecorderDelegate() { }

	/* @optional */
	virtual void audioRecorderDidFinishRecording(LPCTSTR file) { }
	virtual void audioRecorderErrorDidOccur(LPCTSTR file) { }
};

class AudioRecorder : public AudioInputStreamDelegate
{
  public:
	AudioRecorder();
	virtual ~AudioRecorder();

	void delegate(AudioRecorderDelegate* obj);
	AudioRecorderDelegate* delegate();

	void input(AudioInputStream* input);
	AudioInputStream* input() const;

	void device(LPCTSTR deviceId);
	LPCTSTR device() const;

	bool create(LPCTSTR file, enum RecordingFormat format);

	void record();
	void pause();
	void stop(bool shouldStopImmediate);

	void volume(float gain);
	float volume();

	LPCTSTR file() const;
	int status();
	int numberOfChannels();
	float peakPowerForChannel(int channelNumber);
	float currentTime();

	/* AudioInputtStreamDelegate */
	void inputStream(const BYTE* buffer, int length);
	void inputStreamDidClosed();

  private:
	AudioRecorderDelegate* mp_delegate;
	AudioInputStream* mp_input;
	LPTSTR mp_deviceId;

	LPTSTR mp_file;
	IMFSinkWriter* mp_writer;
	DWORD m_streamIndex;
	LONGLONG m_frames;

	void close();
	void write(const BYTE* buffer, int length);
	void closeFile();
};

inline void AudioRecorder::delegate(AudioRecorderDelegate* obj)
	{ mp_delegate = obj; }
inline AudioRecorderDelegate* AudioRecorder::delegate()
	{ return mp_delegate; }

inline AudioInputStream* AudioRecorder::input() const
	{ return mp_input; }

inline LPCTSTR AudioRecorder::file() const
	{ return mp_file; }

#endif /* __AUDIO_RECORDER_H__ */

//
// @(#)RWCInputStream.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __RWC_AUDIO_INPUT_STREAM_H__
#define __RWC_AUDIO_INPUT_STREAM_H__

#include "RWCNetServer.h"
#include "../Audio/AudioInputStream.h"

class RWCConnection;

class RWCAudioInputStream : public AudioInputStream, public RWCNetServer
{
  public:
	RWCAudioInputStream(RWCConnection* conn);
	virtual ~RWCAudioInputStream();

	void delegate(AudioInputStreamDelegate* obj);
	AudioInputStreamDelegate* delegate() const;

	void inputMode(int mode);
	int inputMode() const;

	void start(LPCTSTR deviceId);
	void pause();
	void stop(bool shouldStopImmediate);

	void volume(float gain);
	float volume() const;

	int status() const;
	int numberOfChannels() const;
	float peakPowerForChannel(int channelNumber) const;

	float currentTime() const;

	const WAVEFORMATEX* format();

  private:
	RWCConnection* mp_connection;
	AudioInputStreamDelegate* mp_delegate;
	WAVEFORMATEX m_wfe;
	int m_inputMode;

	/* RWCNetServer */
	void streamOpenCompleted();
	void streamEndEncountered();
	bool streamRunLoop(Socket* socket);

	enum { INPUT_BUF_SIZE = 8192 };
	int _offset;
	BYTE _buffer[INPUT_BUF_SIZE];

	friend class RWCConnection;
};

/* Inline function declarations */

inline RWCAudioInputStream::~RWCAudioInputStream()
	{  stopServer(); }

inline void RWCAudioInputStream::delegate(AudioInputStreamDelegate* obj)
	{ mp_delegate = obj; }
inline AudioInputStreamDelegate* RWCAudioInputStream::delegate() const
	{ return mp_delegate; }

inline const WAVEFORMATEX* RWCAudioInputStream::format()
	{ return &m_wfe; }

inline int RWCAudioInputStream::inputMode() const
	{ return m_inputMode; }

#endif /* __RWC_AUDIO_INPUT_STREAM_H__ */

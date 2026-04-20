//
// @(#)RWCAudioOutputStream.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __RWC_AUDIO_OUTPUT_STREAM_H__
#define __RWC_AUDIO_OUTPUT_STREAM_H__

#include "RWCNetServer.h"
#include "../Audio/AudioOutputStream.h"

class RWCConnection;

class RWCAudioOutputStream : public AudioOutputStream, RWCNetServer
{
  public:
	RWCAudioOutputStream(RWCConnection* conn);
	virtual ~RWCAudioOutputStream();

	void delegate(AudioOutputStreamDelegate* obj);
	AudioOutputStreamDelegate* delegate() const;

	void start(LPCTSTR deviceId);
	void pause();
	void stop();

	void volume(float gain);
	float volume() const;

	void speed(float rate);
	float speed() const;

	void pitch(float cent);
	float pitch() const;

	int status() const;
	int numberOfChannels() const;
	float peakPowerForChannel(int channelNumber) const;

	float currentTime() const;

	const WAVEFORMATEX* format();

  private:
	RWCConnection* mp_connection;
	AudioOutputStreamDelegate* mp_delegate;
	WAVEFORMATEX m_wfe;

	/* RWCNetServer */
	void streamOpenCompleted();
	void streamEndEncountered() { }
	bool streamRunLoop(Socket* socket);

	enum { OUTPUT_BUF_SIZE = 8192 };

	int _length;
	int _offset;
	BYTE _buffer[OUTPUT_BUF_SIZE];

	friend class RWCConnection;
};

/* Inline function declarations */

inline RWCAudioOutputStream::~RWCAudioOutputStream()
	{ stopServer(); }

inline void RWCAudioOutputStream::delegate(AudioOutputStreamDelegate* obj)
	{ mp_delegate = obj; }
inline AudioOutputStreamDelegate* RWCAudioOutputStream::delegate() const
	{ return mp_delegate; }

inline const WAVEFORMATEX* RWCAudioOutputStream::format()
	{ return &m_wfe; }

inline void RWCAudioOutputStream::speed(float rate)
	{ /* not supported */ }
inline float RWCAudioOutputStream::speed() const
	{ return 1.0f; /* not supported */ }
inline void RWCAudioOutputStream::pitch(float cent)
	{ /* not supported */ }
inline float RWCAudioOutputStream::pitch() const
	{ return 0; /* not supported */ }

#endif /* __RWC_AUDIO_OUTPUT_STREAM_H__ */

//
// @(#)RWCMIDIService.h
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __RWC_MIDI_SERVICE_H__
#define __RWC_MIDI_SERVICE_H__

#include "RWCProtocol.h"

class RWCMIDIServiceDelegate
{
  public:
	virtual ~RWCMIDIServiceDelegate() { }

	/* @optional */
	virtual void midiInputMessage(const BYTE* msg, int bytes, DWORD msec, int cable) { }
};

class RWCConnection;

class RWCMIDIService
{
  public:
	RWCMIDIService(RWCConnection* conn);
	virtual ~RWCMIDIService() { }

	void delegate(RWCMIDIServiceDelegate* obj);
	RWCMIDIServiceDelegate* delegate() const;

	void send(const BYTE* msg, int bytes);
	void send(const BYTE* msg, int bytes, int cable);

	bool streaming() const;
	void streaming(bool on);

	float streamingDelayTime() const;
	void streamingDelayTime(float sec);

  private:
	RWCConnection* mp_connection;
	RWCMIDIServiceDelegate* mp_delegate;
	bool m_streaming;
	float m_streamingDelayTime;

	void parse(RNP_MIDI_PACKET* packet, int length);
	void output(int cable, const BYTE* msg, int bytes);

	enum { MIDI_BUFSIZ = 512, MAX_CABLE_NUM = (1 << 4) };

	BYTE _buffer[MIDI_BUFSIZ + 32];
	BYTE _sysexData[MAX_CABLE_NUM][MIDI_BUFSIZ];
	int _sysexSize[MAX_CABLE_NUM];

	friend class RWCConnection;
};

/* Inline function declarations */

inline void RWCMIDIService::delegate(RWCMIDIServiceDelegate* obj)
	{ mp_delegate = obj; }
inline RWCMIDIServiceDelegate* RWCMIDIService::delegate() const
	{ return mp_delegate; }

inline bool RWCMIDIService::streaming() const
	{ return m_streaming; }
inline void RWCMIDIService::streaming(bool on)
	{ m_streaming = on; }

inline float RWCMIDIService::streamingDelayTime() const
	{ return m_streamingDelayTime; }

inline void RWCMIDIService::send(const BYTE* msg, int bytes)
	{ send(msg, bytes, 0); }

#endif /* __RWC_MIDI_SERVICE_H__ */

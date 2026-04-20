//
//	RWCConnection.h
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __RWC_CONNECTION_H__
#define __RWC_CONNECTION_H__

#include "RWCProtocol.h"
#include "RWCNetClient.h"
#include "RWCMIDIService.h"
#include "RWCAudioInputStream.h"
#include "RWCAudioOutputStream.h"

class RWCConnectionDelegate
{
  public:
	virtual ~RWCConnectionDelegate() { }

	/* @optional */
	virtual void connectionFailed(const RWC_DEV_INFO* device) { }
	virtual void connectionDidEstablished(const RWC_DEV_INFO* device) { }
	virtual void connectionDidClosed(const RWC_DEV_INFO* device) { }
	virtual void connectionErrorDidOccur(const RWC_DEV_INFO* device) { }
};

class RWCConnection : public RWCNetClient
{
  public:
	RWCConnection();
	virtual ~RWCConnection();

	const RWC_DEV_INFO* device() const;

	void delegate(RWCConnectionDelegate* obj);
	RWCConnectionDelegate* delegate() const;

	RWCMIDIService* midiService() const;
	RWCAudioInputStream* inputStream() const;
	RWCAudioOutputStream* outputStream() const;

	void connect(const RWC_DEV_INFO* device);
	void disconnect();

	DWORD connectStartTimeStamp() const;
	DWORD outputStartTimeStamp() const;
	DWORD outputStopTimeStamp() const;
	DWORD inputStartTimeStamp() const;
	DWORD inputStopTimeStamp() const;

  private:
	RWC_DEV_INFO* mp_device;

	RWCConnectionDelegate* mp_delegate;

	RWCMIDIService* mp_midiService;
	RWCAudioInputStream* mp_inputStream;
	RWCAudioOutputStream* mp_outputStream;

	void resetAllParameters();
	void updateMetsers();
	float outputLevel(int channelNumber);
	float inputLevel(int channelNumber);

	int writeToServer(BYTE* buf);

	/* RWCNetClient */
	void streamOpenFailed();
	void streamOpenCompleted();
	void streamErrorOccurred();
	void streamEndEncountered();
	bool streamRunLoop(Socket* socket);

	enum { NETREAD_BUF_SIZE = 0x8000 };

	BYTE _buffer[NETREAD_BUF_SIZE];
	DWORD _timeStamp[8];
	RNP_AUDIO_STATUS _audioStatus;
	float _peakPower[4];

	friend class RWCMIDIService;
	friend class RWCAudioInputStream;
	friend class RWCAudioOutputStream;
};

/* Inline function declarations */

inline const RWC_DEV_INFO* RWCConnection::device() const
	{ return mp_device; }

inline void RWCConnection::delegate(RWCConnectionDelegate* obj)
	{ mp_delegate = obj; }
inline RWCConnectionDelegate* RWCConnection::delegate() const
	{ return mp_delegate; }

inline RWCMIDIService* RWCConnection::midiService() const
	{ return mp_midiService; }
inline RWCAudioInputStream* RWCConnection::inputStream() const
	{ return mp_inputStream; }
inline RWCAudioOutputStream* RWCConnection::outputStream() const
	{ return mp_outputStream; }

inline void RWCConnection::streamOpenFailed()
	{  if (mp_delegate) mp_delegate->connectionFailed(mp_device); }
inline void RWCConnection::streamOpenCompleted()
	{ if (mp_delegate) mp_delegate->connectionDidEstablished(mp_device); }
inline void RWCConnection::streamErrorOccurred()
	{ if (mp_delegate) mp_delegate->connectionErrorDidOccur(mp_device); }
inline void RWCConnection::streamEndEncountered()
	{ if (mp_delegate) mp_delegate->connectionDidClosed(mp_device); }

inline DWORD RWCConnection::connectStartTimeStamp() const { return _timeStamp[RNP_SUBTYPE_SYNC_CONNECT]; }
inline DWORD RWCConnection::outputStartTimeStamp() const  { return _timeStamp[RNP_SUBTYPE_SYNC_OUTPUT_START]; }
inline DWORD RWCConnection::outputStopTimeStamp() const   { return _timeStamp[RNP_SUBTYPE_SYNC_OUTPUT_STOP]; }
inline DWORD RWCConnection::inputStartTimeStamp() const   { return _timeStamp[RNP_SUBTYPE_SYNC_INPUT_START]; }
inline DWORD RWCConnection::inputStopTimeStamp() const    { return _timeStamp[RNP_SUBTYPE_SYNC_INPUT_STOP]; }

#endif /* __RWC_CONNECTION_H__ */

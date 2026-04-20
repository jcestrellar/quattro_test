/*
 * @(#)RWCNetClient.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __RWC_NET_CLIENT_H__
#define __RWC_NET_CLIENT_H__

#include "../Network/Socket.h"
#include "../Common/Thread.h"
#include "../Common/Timer.h"

class RWCNetClient : public Thread
{
  public:
	RWCNetClient();
	virtual ~RWCNetClient();

	void connectToServer(LPCTSTR address, const int portNo);
	void stopConnection();

	bool connecting() const;

	int connectTimeout() const;
	void connectTimeout(int seconds);

	int keepAliveTimeout() const;
	void keepAliveTimeout(int seconds);

	virtual void streamOpenCompleted() = 0;
	virtual void streamOpenFailed() = 0;
	virtual void streamErrorOccurred() = 0;
	virtual void streamEndEncountered() = 0;
	virtual bool streamRunLoop(Socket* socket) = 0;

	int send(BYTE* buffer, int length);

	void kill();

  private:
	enum TCPStatus {
		kTCP_Closed,
		kTCP_Opening,
		kTCP_Connecting
	};

	Mutex m_mtx;
	Socket* mp_socket;
	bool m_acceptable;
	bool m_connecting;

	unsigned long _address;
	int _portNo;

	void run();

  protected:
	int m_connectTimeout;
	int m_keepAliveTimeout;
};

/* Inline function declarations */

inline RWCNetClient::~RWCNetClient()
	{ stopConnection(); }

inline bool RWCNetClient::connecting() const
	{ return m_connecting; }

inline int RWCNetClient::connectTimeout() const
	{ return m_connectTimeout; }
inline void RWCNetClient::connectTimeout(int seconds)
	{ m_connectTimeout = seconds; }

inline int RWCNetClient::keepAliveTimeout() const
	{ return m_keepAliveTimeout; }

#endif /* __RWC_NET_CLIENT_H__ */

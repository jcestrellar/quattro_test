/*
 * @(#)RWCNetServer.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __RWC_NET_SERVER_H__
#define __RWC_NET_SERVER_H__

#include "../Network/Socket.h"
#include "../Common/Thread.h"

class RWCNetServer : public Thread
{
  public:
	RWCNetServer(int portNo = 0);
	virtual ~RWCNetServer();

	void startServer();
	void stopServer();

	void acceptConnection();
	void stopConnection();

	int portNo() const;
	bool connecting() const;

	virtual void streamOpenCompleted() = 0;
	virtual void streamEndEncountered() = 0;
	virtual bool streamRunLoop(Socket* socket) = 0;

  private:
	Mutex mtx_server;
	Mutex mtx_connection;
	Event evt_connection;

	ServerSocket* mp_listeningSocket;
	Socket* mp_socket;
	int m_portNo;
	bool m_acceptable;
	bool m_connecting;

	void run();
};

/* Inline function declarations */

inline RWCNetServer::RWCNetServer(int portNo)
{
	evt_connection.set();

	mp_listeningSocket = 0;
	mp_socket = 0;
	m_portNo = portNo;
	m_acceptable = false;
	m_connecting = false;
}

inline RWCNetServer::~RWCNetServer()
	{ stopServer(); }

inline bool RWCNetServer::connecting() const
	{ return (m_connecting && m_acceptable); }

#endif /* __RWC_NET_SERVER_H__ */

/*
 * @(#)TCPIPClient.h
 *
 * Copyright 2019 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __TCPIP_CLIENT_H__
#define __TCPIP_CLIENT_H__

#include "Socket.h"
#include "../Common/Thread.h"

class TCPIPClientDelegate
{
  public:
	virtual ~TCPIPClientDelegate() { }

	/* @required */
	virtual void received(const BYTE* buf, int len) = 0;
	virtual bool closed() = 0;
};

class TCPIPClient : public Socket, public Thread
{
  public:
	TCPIPClient();
	virtual ~TCPIPClient() { };

	void delegate(TCPIPClientDelegate* obj);
	TCPIPClientDelegate* delegate() const;

	void run();

	bool comm_open(LPCTSTR portname, DWORD baudrate);
	bool comm_close();
	int comm_read(void* buf, int len);
	int comm_recv(void* buf, int len);
	int comm_send(void* buf, int len);
	bool comm() { return (m_comm != NULL); }

  private:
	enum { READ_BUFSIZ = 0x20000, COMM_BUFSIZ = 4096 };

	TCPIPClientDelegate* mp_delegate;

	HANDLE m_comm;
};

inline TCPIPClient::TCPIPClient() : mp_delegate(0), m_comm(NULL)
	{ create(); }

inline void TCPIPClient::delegate(TCPIPClientDelegate* obj)
	{ mp_delegate = obj; }
inline TCPIPClientDelegate* TCPIPClient::delegate() const
	{ return mp_delegate; }

#endif /* __TCPIP_CLIENT_H__ */

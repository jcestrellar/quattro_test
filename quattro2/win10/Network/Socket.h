/*
 * @(#)Socket.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __SOCKET_H__
#define __SOCKET_H__

#include <windows.h>

class ServerSocket;

class Socket
{
  public:
	Socket(SOCKET fd = INVALID_SOCKET);
	virtual ~Socket();

	bool create();
	bool connect(unsigned long addr, int port);
	bool connect(unsigned long addr, int port, int timeout);

	int read(void* buf, int len);

	int recv(void* buf, int len);
	int send(void* buf, int len);
	bool close();

	int portNo() const;
	unsigned long addr() const;

  private:
	SOCKET m_fd;
	int m_portNo;
	unsigned long m_addr;

	friend class ServerSocket;
};

class ServerSocket
{
  public:
	ServerSocket();
	virtual ~ServerSocket();

	bool create(int port);
	Socket* accept();
	bool close();

	int portNo() const;

  private:
	SOCKET m_fd;
	int m_portNo;
};

/* Inline function declarations */

inline Socket::Socket(SOCKET fd)
{
	m_fd = fd;
	m_addr = 0;
	m_portNo = 0;
}
inline Socket::~Socket()
	{ close(); }
inline int Socket::portNo() const
	{ return m_portNo; }
inline unsigned long Socket::addr() const
	{ return m_addr; }

inline ServerSocket::ServerSocket()
{
	m_fd = INVALID_SOCKET;
	m_portNo = 0;
}
inline ServerSocket::~ServerSocket()
	{ close(); }
inline int ServerSocket::portNo() const
	{ return m_portNo; }

#endif /* __SOCKET_H__ */

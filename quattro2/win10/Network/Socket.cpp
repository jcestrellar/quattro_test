/*
 * @(#)Socket.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include <winsock2.h>
#include "Socket.h"

bool Socket::create()
{
	if (m_fd != INVALID_SOCKET)
		close();

	if ((m_fd = ::socket(AF_INET, SOCK_STREAM, 0)) == INVALID_SOCKET)
		return false;

	return true;
}

bool Socket::connect(unsigned long saddr, int sport)
{
	if (m_fd == INVALID_SOCKET)
		return false;

	struct sockaddr_in addr;
	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_port = htons(sport);
	addr.sin_addr.s_addr = saddr;
	if (::connect(m_fd, (struct sockaddr *)&addr, sizeof(addr)) == SOCKET_ERROR)
		return false;

	m_addr = saddr;
	m_portNo = sport;

	return true;
}

bool Socket::connect(unsigned long saddr, int sport, int timeout)
{
	if (m_fd == INVALID_SOCKET)
		return false;

	WSAEVENT event;
	if ((event = ::WSACreateEvent()) == WSA_INVALID_EVENT)
		return false;

	if (::WSAEventSelect(m_fd, event, FD_CONNECT) == SOCKET_ERROR) {
		WSACloseEvent(event);
		return false;
	}

	bool success = false;

	DWORD index;
	int err;

	struct sockaddr_in addr;
	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_port = htons(sport);
	addr.sin_addr.s_addr = saddr;
	if (::connect(m_fd, (struct sockaddr *)&addr, sizeof(addr)) == SOCKET_ERROR) {
		if (::WSAGetLastError() != WSAEWOULDBLOCK) goto END;
	}

	index = ::WSAWaitForMultipleEvents(1, &event, FALSE, timeout, FALSE);
	if (index != WSA_WAIT_EVENT_0) goto END;

	WSANETWORKEVENTS events;
	err = ::WSAEnumNetworkEvents(m_fd, event, &events);
	if (err == SOCKET_ERROR) goto END;

	if ((events.lNetworkEvents & FD_CONNECT) && events.iErrorCode[FD_CONNECT_BIT] == 0) {
		success = true;
		m_addr = saddr;
		m_portNo = sport;
	}

END:
	::WSAEventSelect(m_fd, NULL, 0);
	::WSACloseEvent(event);

	DWORD dwNonBlocking = 0;
	::ioctlsocket(m_fd, FIONBIO, &dwNonBlocking);

	return success;
}

int Socket::read(void* buf, int len)
{
	return ::recv(m_fd, (char*)buf, len, 0);
}

int Socket::recv(void* buf, int len)
{
	char* p = (char*)buf;
	while (len > 0) {
		int n = ::recv(m_fd, p, len, 0);
		if (n > 0) {
			p += n; len -= n;
		} else if (n == 0) {
			break;
		} else if (::WSAGetLastError() != WSAEWOULDBLOCK) {
			return -1;
		}
	}
	return (int)(p - (char*)buf);
}

int Socket::send(void* buf, int len)
{
	char* p = (char*)buf;
	while (len > 0) {
		int n = ::send(m_fd, p, len, 0);
		if (n > 0) {
			p += n; len -= n;
		} else if (n == 0) {
			break;
		} else {
			return -1;
		}
	}
	return (int)(p - (char*)buf);
}

bool Socket::close()
{
	m_addr = 0;
	m_portNo = 0;

	if (m_fd != INVALID_SOCKET) {
		SOCKET fd = m_fd;
		m_fd = INVALID_SOCKET;
		::shutdown(fd, SD_BOTH);
		::closesocket(fd);
	}
	return true;
}

bool ServerSocket::create(int port)
{
	if (m_fd != INVALID_SOCKET)
		close();

	SOCKET fd;
	if ((fd = ::socket(AF_INET, SOCK_STREAM, 0)) == INVALID_SOCKET)
		return false;

	struct sockaddr_in addr;
	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_port = htons(port);
	addr.sin_addr.s_addr = INADDR_ANY;
	if (::bind(fd, (struct sockaddr *)&addr, sizeof(addr)) == SOCKET_ERROR) {
		::closesocket(fd);
		return false;
	}

	int addrlen = sizeof(addr);
	if (::getsockname(fd, (struct sockaddr *)&addr, &addrlen) == SOCKET_ERROR) {
		::closesocket(fd);
		return false;
	}
	if (::listen(fd, 5) == SOCKET_ERROR) {
		::closesocket(fd);
		return false;
	}

	m_fd = fd;
	m_portNo = ntohs(addr.sin_port);

	return true;
}

Socket* ServerSocket::accept()
{
	if (m_fd == INVALID_SOCKET)
		return 0;

	SOCKET fd;
	struct sockaddr_in addr;
	memset(&addr, 0, sizeof(addr));
	int addrlen = sizeof(addr);
	if ((fd = ::accept(m_fd, (struct sockaddr *)&addr, &addrlen)) == INVALID_SOCKET)
		return 0;

	Socket *client = new Socket(fd);
	client->m_addr = addr.sin_addr.s_addr;
	client->m_portNo = addr.sin_port;

	return client;
}

bool ServerSocket::close()
{
	m_portNo = 0;

	if (m_fd != INVALID_SOCKET) {
		::shutdown(m_fd, SD_BOTH);
		::closesocket(m_fd);
		m_fd = INVALID_SOCKET;
	}

	return true;
}

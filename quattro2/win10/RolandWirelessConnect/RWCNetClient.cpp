/*
 * @(#)RWCNetClient.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "RWCNetClient.h"
#include "RWCProtocol.h"

/* class KeepAlive */

class KeepAlive : public Thread
{
  public:
	KeepAlive(RWCNetClient* client) :
		mp_client(client), m_repeat(true), m_counter(0) { }
	virtual ~KeepAlive() { }
	void touch() { m_counter = 0; }
	void stop() { m_repeat = false; }

  private:
	RWCNetClient* mp_client;
	bool m_repeat;
	int m_counter;
	void run();
};

void KeepAlive::run()
{
	DWORD t0 = Timer::currentMSecTimestamp();
	while (m_repeat) {
		::Sleep(100);
		DWORD t = Timer::currentMSecTimestamp();
		if ((t - t0) < 1000) continue;
		t0 = t;

		int timeout = mp_client->keepAliveTimeout();

		if (mp_client->connecting() && timeout > 0) {
			RNP_HEADER header;
			header.type    = RNP_TYPE_KEEP_ALIVE;
			header.subtype = RNP_SUBTYPE_0;
			header.size[0] = 0;
			header.size[1] = 0;
			mp_client->send((BYTE*)&header, sizeof(RNP_HEADER));
			if (++m_counter > timeout) {
				mp_client->kill();
				break;
			}
		}
	}
}

/* class RWCNetClient */

RWCNetClient::RWCNetClient()
{
	mp_socket = 0;

	m_acceptable = false;
	m_connecting = false;

	m_connectTimeout = kDefaultConnectTimeout;
	m_keepAliveTimeout = kDefaultKeepAliveTimeout;
}

void RWCNetClient::connectToServer(LPCTSTR address, const int portNo)
{
	mutex_lock obj(m_mtx);

	if ((mp_socket = new Socket()) && mp_socket->create()) {
		m_acceptable = true;
		_address = inet_addr(CStringA(address));
		_portNo  = portNo;
		_threadStart(); /* call run() on new Thread */
	} else {
		delete mp_socket;
		mp_socket = 0;
		streamOpenFailed();
	}
}

void RWCNetClient::stopConnection()
{
	mutex_lock obj(m_mtx);

	m_acceptable = false;

	if (mp_socket) {
		mp_socket->close();
		wait();
		delete mp_socket;
		mp_socket = 0;
	}
}

int RWCNetClient::send(BYTE* buffer, int length)
{
	mutex_lock obj(m_mtx);

	return mp_socket ? mp_socket->send(buffer, length) : 0;
}

void RWCNetClient::run()
{
	if (!mp_socket->connect(_address, _portNo, m_connectTimeout * 1000)) {
		mp_socket->close();
		if (m_acceptable) {
			m_acceptable = false;
			streamOpenFailed();
		}
		return;
	}

	m_connecting = true;
	streamOpenCompleted();

	KeepAlive keepAlive(this);
	keepAlive._threadStart();

	while (m_acceptable && streamRunLoop(mp_socket)) {
		keepAlive.touch();
	}
	keepAlive.stop();

	mp_socket->close();

	m_connecting = false;
	if (m_acceptable) {
		m_acceptable = false;
		streamEndEncountered();
	}

	keepAlive.wait();
}

void RWCNetClient::keepAliveTimeout(int seconds)
{
	m_keepAliveTimeout = seconds;

	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER *)buf;
	header->type	= RNP_TYPE_KEEP_ALIVE;
	header->subtype = RNP_SUBTYPE_SET_TIMEOUT;
	header->size[0] = 0;
	header->size[1] = 1;

	RNP_KEEP_ALIVE_TIMEOUT *timeout = (RNP_KEEP_ALIVE_TIMEOUT *)(buf + sizeof(RNP_HEADER));
	timeout->seconds = (unsigned char)seconds;

	send(buf, sizeof(RNP_HEADER) + 1);
}

void RWCNetClient::kill()
{
	mutex_lock obj(m_mtx);

	if (mp_socket) {
		mp_socket->close();
	}
}

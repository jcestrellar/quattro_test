/*
 * @(#)RWCNetServer.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "RWCNetServer.h"

void RWCNetServer::startServer()
{
	mutex_lock obj(mtx_server);

	if (mp_listeningSocket = new ServerSocket()) {
		if (mp_listeningSocket->create(m_portNo)) {
			_threadStart(); /* call run() on new Thread */
		} else {
			delete mp_listeningSocket;
			mp_listeningSocket = 0;
		}
	}
}

void RWCNetServer::stopServer()
{
	stopConnection();

	mutex_lock obj(mtx_server);

	if (mp_listeningSocket) {
		mp_listeningSocket->close();
		wait();
		delete mp_listeningSocket;
		mp_listeningSocket = 0;
	}
}

int RWCNetServer::portNo() const
{
	mutex_lock obj(mtx_server);

	return mp_listeningSocket ? mp_listeningSocket->portNo() : 0;
}

void RWCNetServer::run()
{
	Socket *fd;
	while (fd = mp_listeningSocket->accept()) {

		{
			mutex_lock obj(mtx_connection);
			mp_socket = fd;
			evt_connection.reset();
		}

		m_connecting = true;
		streamOpenCompleted();

		while (m_acceptable && streamRunLoop(fd)) ;

		m_connecting = false;
		if (m_acceptable) {
			m_acceptable = false;
			streamEndEncountered();
		}

		{
			mutex_lock obj(mtx_connection);
			mp_socket = 0;
			evt_connection.set();
		}

		delete fd;
	}
}

void RWCNetServer::acceptConnection()
{
	m_acceptable = true;
}

void RWCNetServer::stopConnection()
{
	m_acceptable = false;

	do {
		mutex_lock obj(mtx_connection);
		if (mp_socket)
			mp_socket->close();
	} while (!evt_connection.wait(100));
}

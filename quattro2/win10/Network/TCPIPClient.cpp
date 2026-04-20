/*
 * @(#)TCPIPClient.cpp
 *
 * Copyright 2019 Roland Corporation, Japan. All rights reserved.
 */

#include "TCPIPClient.h"

void TCPIPClient::run()
{
	BYTE* buf = new BYTE[READ_BUFSIZ];

	while (true) {
		int len = comm() ? comm_read(buf, COMM_BUFSIZ) : read(buf, READ_BUFSIZ);
		if (len <= 0) break;
		if (mp_delegate) {
			mp_delegate->received(buf, len);
		}
	}

	delete [] buf;

	if (mp_delegate) {
		if (mp_delegate->closed()) {
			delete mp_delegate;
		}
		mp_delegate = 0;
	}
}

/* COMM functions */

bool TCPIPClient::comm_open(LPCTSTR portname, DWORD baudrate)
{
	if (m_comm)
		comm_close();

	TCHAR file[64];
	wsprintf(file, TEXT("\\\\.\\%s"), portname);
	m_comm = ::CreateFile(file, GENERIC_READ | GENERIC_WRITE,
					0, NULL, OPEN_EXISTING, FILE_FLAG_OVERLAPPED, NULL);
	if (m_comm == INVALID_HANDLE_VALUE) {
		m_comm = NULL; return false;
	}
	if (!::PurgeComm(m_comm, PURGE_TXABORT | PURGE_RXABORT | PURGE_TXCLEAR | PURGE_RXCLEAR)) {
		comm_close(); return false;
	}

	COMMTIMEOUTS commmTimeouts;
	commmTimeouts.ReadIntervalTimeout = 10;
	commmTimeouts.ReadTotalTimeoutMultiplier = 0;
	commmTimeouts.ReadTotalTimeoutConstant = 0;
	commmTimeouts.WriteTotalTimeoutMultiplier = 0;
	commmTimeouts.WriteTotalTimeoutConstant = 0;
	if (!::SetCommTimeouts(m_comm, &commmTimeouts)) {
		comm_close(); return false;
	}

	DCB dcb;
	if (!::GetCommState(m_comm, &dcb)) {
		comm_close(); return false;
	}
	if (baudrate) {
		dcb.BaudRate = baudrate;
	}
	if (!::SetCommState(m_comm, &dcb)) {
		comm_close(); return false;
	}

	::EscapeCommFunction(m_comm, SETDTR);

	return true;
}

int TCPIPClient::comm_read(void* buf, int len)
{
	bool err = false;
	if (len > 0) {
		OVERLAPPED ovl = {0};
		ovl.hEvent = ::CreateEvent(NULL, TRUE, FALSE, NULL);
		for (bool reading = false; !err; ) {
			if (reading) {
				DWORD ret = ::WaitForSingleObject(ovl.hEvent, 500);
				switch (ret) {
					case WAIT_TIMEOUT:
						break;
					case WAIT_OBJECT_0:
						DWORD bytes;
						if (::GetOverlappedResult(m_comm, &ovl, &bytes, FALSE)) {
							if (bytes > 0) {
								::CloseHandle(ovl.hEvent);
								return bytes;
							}
							::ResetEvent(ovl.hEvent);
							reading = false;
						} else if (::GetLastError() == ERROR_OPERATION_ABORTED) {
							::CloseHandle(ovl.hEvent);
							return 0;
						} else {
							err = true;
						}
						break;
					default:
						err = true;
						break;
				}
			} else {
				DWORD bytes;
				if (::ReadFile(m_comm, buf, len, &bytes, &ovl)) {
					if (bytes > 0) {
						::CloseHandle(ovl.hEvent);
						return bytes;
					}
				} else if (::GetLastError() == ERROR_IO_PENDING) {
					reading = true;
				} else {
					err = true;
				}
			}
		}
		::CloseHandle(ovl.hEvent);
	}
	return err ? -1 : 0;
}

int TCPIPClient::comm_recv(void* buf, int len)
{
	char* p = (char*)buf;
	while (len > 0) {
		int n = comm_read(p, len);
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

static int comm_send(HANDLE comm, void* buf, int len)
{
	OVERLAPPED ovl = {0};
	ovl.hEvent = ::CreateEvent(NULL, TRUE, FALSE, NULL);

	DWORD bytes;
	if (::WriteFile(comm, buf, len, &bytes, &ovl)) {
		::CloseHandle(ovl.hEvent);
		return (int)bytes;
	} else if (::GetLastError() == ERROR_IO_PENDING) {
		DWORD ret = ::WaitForSingleObject(ovl.hEvent, INFINITE);
		switch (ret) {
			case WAIT_OBJECT_0:
				if (::GetOverlappedResult(comm, &ovl, &bytes, FALSE)) {
					::CloseHandle(ovl.hEvent);
					return (int)bytes;
				}
				break;
			default:
				break;
		}
	}

	::CloseHandle(ovl.hEvent);
	return -1;
}

int TCPIPClient::comm_send(void* buf, int len)
{
	char* p = (char*)buf;
	while (len > 0) {
		int n = ::comm_send(m_comm, p, len);
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

bool TCPIPClient::comm_close()
{
	if (m_comm) {
		HANDLE comm = m_comm;
		m_comm = NULL;
		::EscapeCommFunction(comm, CLRDTR);
		::PurgeComm(comm, PURGE_TXABORT | PURGE_RXABORT | PURGE_TXCLEAR | PURGE_RXCLEAR);
		::CloseHandle(comm);
	}
	return true;
}

/*
* @(#)HTTPTask.cpp
*
* Copyright 2018 Roland Corporation, Japan. All rights reserved.
*/

#include "HTTPTask.h"
#include "HTTPConnection.h"

HTTPTask::HTTPTask(HTTPConnection* conn, LPCTSTR url, LPCTSTR file)
{
	m_cleanup = false;
	m_abort = false;
	m_conn = conn;
	m_url = url;
	if (file && *file) {
		m_file = file;
	}

	hSession = NULL;
	hService = NULL;
	hRequest = NULL;
	hFile = INVALID_HANDLE_VALUE;

	databuf = new BYTE [datalen];
}

HTTPTask::~HTTPTask()
{
	close();

	delete [] databuf;

	if (m_abort && m_cleanup) {
		::DeleteFile(m_file);
	}

	m_conn->remove(::GetCurrentThreadId());
}

void HTTPTask::close()
{
	if (hRequest) ::InternetCloseHandle(hRequest);
	if (hService) ::InternetCloseHandle(hService);
	if (hSession) ::InternetCloseHandle(hSession);

	if (hFile != INVALID_HANDLE_VALUE) ::CloseHandle(hFile);
}

void HTTPTask::error()
{
	m_conn->error(::GetCurrentThreadId(), m_url);
	abort();
}

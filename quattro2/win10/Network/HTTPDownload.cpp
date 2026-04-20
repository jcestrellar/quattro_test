/*
 * @(#)HTTPDownload.cpp
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */

#include "HTTPDownload.h"
#include "HTTPConnection.h"

void HTTPDownload::run()
{
	m_conn->insert(::GetCurrentThreadId(), this);

	if (m_file.IsEmpty()) {
		TCHAR path[MAX_PATH];
		TCHAR name[MAX_PATH];
		::GetTempPath(MAX_PATH, path);
		::GetTempFileName(path, TEXT("___"), 0, name);
		m_file = name;
	}

	hFile = ::CreateFile(m_file, GENERIC_WRITE, FILE_SHARE_READ, NULL,
					CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hFile == INVALID_HANDLE_VALUE) {
		error();
		return;
	}

	hSession = ::InternetOpen(TEXT("Roland"), INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
	if (hSession == NULL) {
		error();
		return;
	}

	DWORD ms = 10000;
	::InternetSetOption(hSession, INTERNET_OPTION_CONNECT_TIMEOUT, &ms, sizeof(ms));
	::InternetSetOption(hSession, INTERNET_OPTION_DATA_SEND_TIMEOUT, &ms, sizeof(ms));
	::InternetSetOption(hSession, INTERNET_OPTION_DATA_RECEIVE_TIMEOUT, &ms, sizeof(ms));

	hService = ::InternetOpenUrl(hSession, m_url, NULL, 0, INTERNET_FLAG_DONT_CACHE | INTERNET_FLAG_RELOAD, 0);
	if (hService == NULL) {
		error();
		return;
	}

	DWORD dwLength;
	BOOL  ret;

	DWORD dwStatusCode = 0;
	dwLength = sizeof(dwStatusCode);
	ret = ::HttpQueryInfo(hService,
					HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER,
					&dwStatusCode,
					&dwLength,
					NULL);
	if (!ret || dwStatusCode != 200) {
		error();
		return;
	}

	DWORD dwContentLength = 0;
	dwLength = sizeof(dwContentLength);
	ret = ::HttpQueryInfo(hService,
					HTTP_QUERY_CONTENT_LENGTH | HTTP_QUERY_FLAG_NUMBER,
					&dwContentLength,
					&dwLength,
					NULL);

	DWORD dwLoaded = 0;

	while (!m_abort) {
		DWORD bytes;
		ret = ::InternetReadFile(hService, databuf, datalen, &bytes);
		if (!ret) {
			error();
			return;
		}
		if (bytes == 0) {
			break;
		}

		DWORD written;
		ret = ::WriteFile(hFile , databuf, bytes, &written, NULL);
		if (!ret || (bytes != written)) {
			error();
			return;
		}

		dwLoaded += bytes;
		m_conn->progress(::GetCurrentThreadId(), dwContentLength, dwLoaded);
	}

	::CloseHandle(hFile);
	hFile = INVALID_HANDLE_VALUE;

	if (!m_abort) {
		m_conn->finish(::GetCurrentThreadId(), m_file);
	}
}

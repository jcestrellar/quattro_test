/*
* @(#)HTTPUpload.cpp
*
* Copyright 2018 Roland Corporation, Japan. All rights reserved.
*/

#include "HTTPUpload.h"
#include "HTTPConnection.h"

void HTTPUpload::run()
{
	m_conn->insert(::GetCurrentThreadId(), this);

	hFile = ::CreateFile(m_file, GENERIC_READ, FILE_SHARE_READ, NULL,
					OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hFile == INVALID_HANDLE_VALUE) {
		error();
		return;
	}

	URL_COMPONENTS components;
	TCHAR scheme[8], user[128], passwd[128], host[256], path[2048];
	memset(&components, 0, sizeof(components));
	components.dwStructSize = sizeof(components);
	components.lpszScheme = scheme;
	components.dwSchemeLength = sizeof(scheme) / sizeof(TCHAR);
	components.lpszUserName = user;
	components.dwUserNameLength = sizeof(user) / sizeof(TCHAR);
	components.lpszPassword = passwd;
	components.dwPasswordLength = sizeof(passwd) / sizeof(TCHAR);
	components.lpszHostName = host;
	components.dwHostNameLength = sizeof(host) / sizeof(TCHAR);
	components.lpszUrlPath = path;
	components.dwUrlPathLength = sizeof(path) / sizeof(TCHAR);
	if (!InternetCrackUrl(m_url, (DWORD)_tcslen(m_url), 0, &components)) {
		error();
		return;
	}

	DWORD dwflags = 0;
	if (components.nScheme == INTERNET_SCHEME_HTTP) {
		dwflags = INTERNET_FLAG_RELOAD
				| INTERNET_FLAG_DONT_CACHE
				| INTERNET_FLAG_NO_AUTO_REDIRECT;
	} else if (components.nScheme == INTERNET_SCHEME_HTTPS) {
		dwflags = INTERNET_FLAG_RELOAD
				| INTERNET_FLAG_DONT_CACHE
				| INTERNET_FLAG_NO_AUTO_REDIRECT
				| INTERNET_FLAG_SECURE
				| INTERNET_FLAG_IGNORE_CERT_DATE_INVALID
				| INTERNET_FLAG_IGNORE_CERT_CN_INVALID;
	} else {
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

	hService = ::InternetConnect(
						hSession,
						components.lpszHostName,
						components.nPort,
						components.lpszUserName,
						components.lpszPassword,
						INTERNET_SERVICE_HTTP, 0, NULL);
	if (hService == NULL) {
		error();
		return;
	}

	hRequest = ::HttpOpenRequest(
						hService,
						TEXT("PUT"),
						components.lpszUrlPath,
						NULL, NULL, NULL, dwflags, NULL); 
	if (hRequest == NULL) {
		error();
		return;
	}

	DWORD dwContentLength = ::GetFileSize(hFile, NULL);

	INTERNET_BUFFERS BufferIn = {0};
	BufferIn.dwStructSize = sizeof(INTERNET_BUFFERS);
	BufferIn.dwBufferTotal = dwContentLength;
	if (!::HttpSendRequestEx(hRequest, &BufferIn, NULL, 0, 0)) {
		error();
		return;
	}

	DWORD dwLoaded = 0;
	BOOL ret;

	while (!m_abort) {
		DWORD bytes;
		ret = ::ReadFile(hFile, databuf, datalen, &bytes, NULL);
		if (!ret) {
			error();
			return;
		}
		if (bytes == 0) {
			break;
		}

		DWORD written;
		ret = ::InternetWriteFile(hRequest, databuf, bytes, &written);
		if (!ret || (bytes != written)) {
			error();
			return;
		}

		dwLoaded += bytes;
		m_conn->progress(::GetCurrentThreadId(), dwContentLength, dwLoaded);
	}

	if (!m_abort) {
		if (!::HttpEndRequest(hRequest, NULL, 0, NULL)) {
			error();
			return;
		}

		DWORD dwStatusCode = 0;
		DWORD dwLength = sizeof(dwStatusCode);
		ret = ::HttpQueryInfo(hRequest,
						HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER,
						&dwStatusCode,
						&dwLength,
						NULL);
		if (!ret || (dwStatusCode != 200 && dwStatusCode != 201)) {
			error();
			return;
		}

		m_conn->finish(::GetCurrentThreadId(), m_file);
	}
}

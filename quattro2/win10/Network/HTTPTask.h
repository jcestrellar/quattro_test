/*
 * @(#)HTTPTask.h
 *
 * Copyright 2017 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __HTTP_TASK_H__
#define __HTTP_TASK_H__

#include <windows.h>
#include <wininet.h>
#include <atlstr.h>
#include "../Common/Thread.h"

class HTTPConnection;

class HTTPTask : public Thread
{
  public:
	HTTPTask(HTTPConnection* conn, LPCTSTR url, LPCTSTR file);
	virtual ~HTTPTask();

	void abort();

  protected:
#ifdef HTTP_DATA_SIZE
	enum { datalen = HTTP_DATA_SIZE };
#else
	enum { datalen = 0x100000 };
#endif

	HTTPConnection* m_conn;
	CString   m_url;
	CString   m_file;
	bool      m_abort;
	bool      m_cleanup;

	HINTERNET hInternet;
	HINTERNET hSession;
	HINTERNET hService;
	HINTERNET hRequest;

	HANDLE    hFile;
	BYTE*     databuf;

	void close();
	void error();
};

/* Inline function declarations */

inline void HTTPTask::abort()
	{ m_abort = true; }

#endif /* __HTTP_TASK_H__ */

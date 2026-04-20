/*
 * @(#)HTTPConnection.h
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __HTTP_CONNECTION_H__
#define __HTTP_CONNECTION_H__

#include "HTTPTask.h"
#include <map>

class HTTPConnectionDelegate
{
  public:
	virtual ~HTTPConnectionDelegate() { }

	/* @optional */
	virtual void connectionDidFinishLoading(DWORD id, LPCTSTR file) = 0;
	virtual void connectionDidLoadData(DWORD id, DWORD contentLength, DWORD loaded) = 0;
	virtual void connectionErrorDidOccur(DWORD id, LPCTSTR url) = 0;
};

class HTTPConnection
{
  public:
	HTTPConnection();
	virtual ~HTTPConnection();

	void delegate(HTTPConnectionDelegate* obj);
	HTTPConnectionDelegate* delegate() const;

	DWORD download(LPCTSTR url, LPCTSTR file);
	DWORD upload(LPCTSTR url, LPCTSTR file);
	void cancel(DWORD id);

  private:
	HTTPConnectionDelegate* mp_delegate;

	void progress(DWORD id, DWORD contentLength, DWORD loaded);
	void finish(DWORD id, LPCTSTR file);
	void error(DWORD id, LPCTSTR url);

	Mutex mtx_map;
	std::map<DWORD, HTTPTask*> idMap;
	void insert(DWORD id, HTTPTask* obj);
	void remove(DWORD id);

	friend class HTTPTask;
	friend class HTTPDownload;
	friend class HTTPUpload;
};

/* Inline function declarations */

inline HTTPConnection::HTTPConnection()
	{ mp_delegate = 0; }

inline void HTTPConnection::delegate(HTTPConnectionDelegate* obj)
	{ mp_delegate = obj; }
inline HTTPConnectionDelegate* HTTPConnection::delegate() const
	{ return mp_delegate; }

#endif /* __HTTP_CONNECTION_H__ */

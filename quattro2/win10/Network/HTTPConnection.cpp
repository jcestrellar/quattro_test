/*
 * @(#)HTTPConnection.cpp
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */

#include "HTTPConnection.h"
#include "HTTPDownload.h"
#include "HTTPUpload.h"

HTTPConnection::~HTTPConnection()
{
	{
		mutex_lock mtx(mtx_map);
		std::map<DWORD, HTTPTask*>::iterator iter = idMap.begin();
		for ( ; iter != idMap.end(); iter++) {
			HTTPTask* obj = iter->second;
			obj->abort();
		}
	}

	while (!idMap.empty()) ;
}

DWORD HTTPConnection::download(LPCTSTR url, LPCTSTR file)
{
	if (url == NULL)
		return 0xffffffff;

	return (new HTTPDownload(this, url, file))->_threadStart(true);
}

DWORD HTTPConnection::upload(LPCTSTR url, LPCTSTR file)
{
	if (url == NULL || file == NULL)
		return 0xffffffff;

	return (new HTTPUpload(this, url, file))->_threadStart(true);
}

void HTTPConnection::cancel(DWORD id)
{
	mutex_lock mtx(mtx_map);

	std::map<DWORD, HTTPTask*>::iterator iter = idMap.find(id);
	if (iter != idMap.end()) {
		HTTPTask* obj = iter->second;
		obj->abort();
	}
}

void HTTPConnection::insert(DWORD id, HTTPTask* obj)
{
	mutex_lock mtx(mtx_map);

	idMap.insert(std::make_pair(id, obj));
}

void HTTPConnection::remove(DWORD id)
{
	mutex_lock mtx(mtx_map);

	std::map<DWORD, HTTPTask*>::iterator iter = idMap.find(id);
	if (iter != idMap.end()) {
		idMap.erase(iter);
	}
}

void HTTPConnection::progress(DWORD id, DWORD contentLength, DWORD loaded)
{
	if (mp_delegate) {
		mp_delegate->connectionDidLoadData(id, contentLength, loaded);
	}
}

void HTTPConnection::finish(DWORD id, LPCTSTR file)
{
	if (mp_delegate) {
		mp_delegate->connectionDidFinishLoading(id, file);
	}
}

void HTTPConnection::error(DWORD id, LPCTSTR url)
{
	if (mp_delegate) {
		mp_delegate->connectionErrorDidOccur(id, url);
	}
}

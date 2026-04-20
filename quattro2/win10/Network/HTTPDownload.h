/*
 * @(#)HTTPDownload.h
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __HTTP_DOWNLOAD_H__
#define __HTTP_DOWNLOAD_H__

#include "HTTPTask.h"

class HTTPDownload : public HTTPTask
{
  public:
	HTTPDownload(HTTPConnection* conn, LPCTSTR url, LPCTSTR file)
		: HTTPTask(conn, url, file) { m_cleanup = true; }

	void run();
};

#endif /* __HTTP_DOWNLOAD_H__ */

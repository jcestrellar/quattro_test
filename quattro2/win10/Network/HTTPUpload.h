/*
 * @(#)HTTPUpload.h
 *
 * Copyright 2018 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __HTTP_UPLOAD_H__
#define __HTTP_UPLOAD_H__

#include "HTTPTask.h"

class HTTPUpload : public HTTPTask
{
  public:
	HTTPUpload(HTTPConnection* conn, LPCTSTR url, LPCTSTR file)
		: HTTPTask(conn, url, file) {}

	void run();
};

#endif /* __HTTP_UPLOAD_H__ */

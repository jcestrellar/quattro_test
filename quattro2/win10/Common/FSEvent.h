/*
 * @(#)FSEvent.h
 *
 * Copyright 2024 Roland Corporation, Japan. All rights reserved.
 */
#ifndef __FS_EVENT_H__
#define __FS_EVENT_H__

#include <windows.h>
#include <shlwapi.h>
#include <vector>
#include <string>
#include <algorithm>
#include "Thread.h"

class FSEventDelegate
{
  public:
	virtual ~FSEventDelegate() { }

	/* @optional */
	virtual void directoryDidUpdate(std::vector<std::wstring> paths) = 0;
};

class FSEvent : public Thread {

  public:
	FSEvent();
	virtual ~FSEvent();

	void delegate(FSEventDelegate* obj);
	FSEventDelegate* delegate() const;

	void observe(const std::wstring);
	void run();

  private:
	FSEventDelegate* mp_delegate;
	std::vector<std::wstring> m_paths;

	std::wstring m_path;
	HANDLE m_dir;
	HANDLE m_event;
	bool m_quit;

	void quit();
};

inline void FSEvent::delegate(FSEventDelegate* obj)
	{ mp_delegate = obj; }
inline FSEventDelegate* FSEvent::delegate() const
	{ return mp_delegate; }

#endif /* __FS_EVENT_H__ */

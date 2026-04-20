/*
 * @(#)Process.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __PROCESS_H__
#define __PROCESS_H__

#include <windows.h>
#include <atlstr.h>
#include "Thread.h"

typedef void (*PROCESS_OUTPUT_MONITOR)(DWORD, LPCTSTR, void*);

class Process : public Thread {

  public:
	Process(PROCESS_OUTPUT_MONITOR monitor, void* userInfo);
	virtual ~Process();

	DWORD launch(LPCTSTR commandLine);
	void run();

  private:
	void* mp_userInfo;
	PROCESS_OUTPUT_MONITOR mp_monitor;

	HANDLE m_readPipe;
	HANDLE m_writePipe;
	DWORD m_pid;
};

/* Inline function declarations */

inline Process::Process(PROCESS_OUTPUT_MONITOR monitor, void* userInfo)
	: mp_monitor(monitor), mp_userInfo(userInfo)
{
	m_readPipe = NULL;
	m_writePipe = NULL;
	m_pid = 0;
}

inline Process::~Process()
{
	if (m_readPipe) {
		::CloseHandle(m_readPipe);
	}
	if (m_writePipe) {
		::CloseHandle(m_writePipe);
	}
}

#endif /* __PROCESS_H__ */

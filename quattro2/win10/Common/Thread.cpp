/*
 * @(#)Thread.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "Thread.h"

HWND Thread::m_mainWindow = NULL;

void Thread::runOnMainThread(std::function<void()> task)
{
	auto* wparam = new std::function<void()>(std::move(task));
	::PostMessage(m_mainWindow, WM_RUN_ASYNC, reinterpret_cast<WPARAM>(wparam), 0);
}

static DWORD WINAPI _threadWrapper(LPVOID param)
{
	Thread* _this = (Thread*)param;

	_this->run();

	if (_this->m_deleteSelf) {
		delete _this;
	}

	return 0;
}

DWORD Thread::_threadStart(bool deleteSelf)
{
	assert(m_thread == NULL);

	m_deleteSelf = deleteSelf;

	DWORD tid;
	m_thread = ::CreateThread(NULL, 0,
		_threadWrapper, (void*)this, CREATE_SUSPENDED, &tid);

	::ResumeThread(m_thread);

	return tid;
}

/*
 * @(#)Thread.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __THREAD_H__
#define __THREAD_H__

#include <windows.h>
#include <assert.h>
#include <functional>

#define WM_RUN_ASYNC (WM_APP + 0x100)

class Thread
{
  public:
	Thread();
	virtual ~Thread();

	DWORD _threadStart(bool deleteSelf = false);

	virtual void run() = 0;

	void wait(DWORD timeout = INFINITE);

	static HWND m_mainWindow;
	static void runOnMainThread(std::function<void()> task);

  private:
	HANDLE m_thread;

  public: /* for _threadWrapper() */
	bool m_deleteSelf;

  protected:
 	void exit();
};

/* Inline function declarations */

inline Thread::Thread()
{
	m_thread = NULL;
	m_deleteSelf = false;
}

inline Thread::~Thread()
{
	if (m_thread) {
		::CloseHandle(m_thread);
	}
}

inline void Thread::wait(DWORD timeout)
{
	if (m_thread) {
		::WaitForSingleObject(m_thread, timeout);
		::CloseHandle(m_thread);
		m_thread = NULL;
	}
}

inline void Thread::exit()
{
	if (m_thread) {
		m_thread = NULL;
		::ExitThread(0);
	}
}

/* Synchronous objects */

class mutex_lock;

class Mutex {

  private:
	HANDLE m_mutex;

  public:
	Mutex() {
		m_mutex = ::CreateMutex(0, FALSE, NULL);
		assert(m_mutex != NULL);
	}
	~Mutex() { ::CloseHandle(m_mutex); }

	friend class mutex_lock;
};

class mutex_lock {

  private:
	HANDLE m_mutex;

  public:
	mutex_lock(const Mutex& obj) : m_mutex(obj.m_mutex) {
		::WaitForSingleObject(m_mutex, INFINITE);
	}
	~mutex_lock() { ::ReleaseMutex(m_mutex); }
};

class Event {

  private:
	HANDLE m_event;

  public:
	Event() {
		m_event = ::CreateEvent(NULL, TRUE, FALSE, NULL);
		assert(m_event != NULL);
	}
	~Event() { ::CloseHandle(m_event); }

	void set() { ::SetEvent(m_event); }
	void reset() { ::ResetEvent(m_event); }
	bool wait(DWORD timeout = INFINITE) {
		DWORD result;
		result = ::WaitForSingleObject(m_event, timeout);
		return !(result == WAIT_TIMEOUT);
	}
};

#endif /* __THREAD_H__ */

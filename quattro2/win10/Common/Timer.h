/*
 * @(#)Timer.h
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __TIMER_H__
#define __TIMER_H__

#include "Thread.h"

class Timer : public Thread {
  public: 
	class Proc {
	  public:
		virtual ~Proc() {};
		virtual void timerproc() = 0;
	};

	Timer(Proc* proc);
	~Timer();
	void start(DWORD msec);
	void stop();

	DWORD tid() const;

	void run();

	static double currentUSecTimestamp();
	static DWORD currentMSecTimestamp();

  private:
	Proc* mp_proc;
	HANDLE m_event;
	DWORD m_timeout;
	DWORD m_tid;

	void close();
};

/* Inline function declarations */

inline Timer::Timer(Proc* proc)
{
	assert(proc != NULL);

	mp_proc = proc;

	m_event = ::CreateEvent(NULL, TRUE, FALSE, NULL);
	m_timeout = 0;
	m_tid = 0;
}

inline Timer::~Timer()
{
	close();
	::CloseHandle(m_event);
}

inline void Timer::start(DWORD msec)
{
	assert(msec != 0);

	close();

	m_timeout = msec;
	::ResetEvent(m_event);
	m_tid = _threadStart();
}

inline DWORD Timer::tid() const
	{ return m_tid; }

inline void Timer::run()
{
	while (::WaitForSingleObject(m_event, m_timeout) == WAIT_TIMEOUT) {
		mp_proc->timerproc();
	}
}

inline void Timer::stop()
	{ ::SetEvent(m_event); }

inline void Timer::close()
{
	stop();
	wait();
	m_tid = 0;
}

inline DWORD Timer::currentMSecTimestamp()
	{ return DWORD(currentUSecTimestamp() / 1000); }

#endif /* __TIMER_H__ */
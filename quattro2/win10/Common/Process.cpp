/*
 * @(#)Process.cpp
 *
 * Copyright 2019 Roland Corporation, Japan. All rights reserved.
 */

#include "Process.h"

DWORD Process::launch(LPCTSTR commandLine)
{
	HANDLE writeTemp;
	::CreatePipe(&m_readPipe, &writeTemp, NULL, 0);
	::DuplicateHandle(
		GetCurrentProcess(), writeTemp,
		GetCurrentProcess(), &m_writePipe,
		0, TRUE, DUPLICATE_SAME_ACCESS);
	::CloseHandle(writeTemp);

	STARTUPINFO si;
	memset(&si, 0, sizeof(si));

	si.cb          = sizeof(STARTUPINFO);
	si.hStdInput   = ::GetStdHandle(STD_INPUT_HANDLE);
	si.hStdOutput  = m_writePipe;
	si.hStdError   = ::GetStdHandle(STD_ERROR_HANDLE);
	si.dwFlags     = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
	si.wShowWindow = SW_HIDE;

	PROCESS_INFORMATION pi;
	memset(&pi, 0, sizeof(pi));
	if (::CreateProcess(NULL, (LPTSTR)commandLine, NULL, NULL, TRUE,
			0, NULL, NULL, &si, &pi)) {
		::CloseHandle(pi.hProcess);
		::CloseHandle(pi.hThread);
		m_pid = pi.dwProcessId;
	}
	::CloseHandle(m_writePipe);
	m_writePipe = NULL;

	_threadStart(true);

	return m_pid;
}

void Process::run()
{
	for (;;) {
		const int bufSize = 512;
		BYTE buf[bufSize + 1];
		DWORD bytes;
		if (!::ReadFile(m_readPipe, buf, bufSize, &bytes, NULL) || !bytes)
			break;
		if (mp_monitor) {
			buf[bytes] = TEXT('\0');
			CString output(buf);
			output.Replace(TEXT("\r\n"), TEXT("\n"));
			mp_monitor(m_pid, output, mp_userInfo);
		}
	}
	if (mp_monitor) {
		mp_monitor(m_pid, TEXT(""), mp_userInfo); /* EOF */
	}
}

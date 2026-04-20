/*
 * @(#)FSEvent.cpp
 *
 * Copyright 2024 Roland Corporation, Japan. All rights reserved.
 */

#include "FSEvent.h"

FSEvent::FSEvent()
{
	mp_delegate = 0;

	m_event = ::CreateEvent(NULL, TRUE, FALSE, NULL);
	m_dir = INVALID_HANDLE_VALUE;
	m_quit = false;
}

FSEvent::~FSEvent()
{
	quit();
	::CloseHandle(m_event);
}

void FSEvent::observe(const std::wstring path)
{
	quit();

	if (!path.empty()) {
		m_dir = ::CreateFileW(path.c_str(), FILE_LIST_DIRECTORY,
			FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
			NULL, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED, NULL);
		if (m_dir != INVALID_HANDLE_VALUE) {
			m_path = path + (*path.rbegin() != L'\\' ? L"\\" : L"");
			m_quit = false;
			_threadStart();
		}
	}
}

void FSEvent::quit()
{
	if (m_dir != INVALID_HANDLE_VALUE) {
		m_quit = true;
		::SetEvent(m_event);
		wait();
		::CloseHandle(m_dir);
		m_dir = INVALID_HANDLE_VALUE;
	}
}

void FSEvent::run()
{
	const int bufsize = 4096;
	DWORD* buffer = new DWORD[bufsize];

	DWORD dwNotifyFilter = (
		FILE_NOTIFY_CHANGE_FILE_NAME |
		FILE_NOTIFY_CHANGE_DIR_NAME |
		FILE_NOTIFY_CHANGE_ATTRIBUTES |
		FILE_NOTIFY_CHANGE_LAST_WRITE
	);

	OVERLAPPED overlapped = { 0 };
	overlapped.hEvent = m_event;

	while (true) {
		if (!::ResetEvent(m_event)) break;
		if (!::ReadDirectoryChangesW(m_dir, buffer, bufsize, TRUE, dwNotifyFilter, NULL, &overlapped, NULL)) break;
		while (::WaitForSingleObject(m_event, 500) == WAIT_TIMEOUT) {
			if (!m_quit && mp_delegate && m_paths.size()) {
				mp_delegate->directoryDidUpdate(m_paths);
				m_paths.clear();
			}
		}
		if (m_quit) {
			::CancelIo(m_dir);
			::WaitForSingleObject(m_event, INFINITE);
			break;
		}

		DWORD dwBytesReturned;
		if (!::GetOverlappedResult(m_dir, &overlapped, &dwBytesReturned, FALSE)) break;

		if (dwBytesReturned > 0) {
			BYTE* ptr = (BYTE*)buffer;
			while (true) {
				FILE_NOTIFY_INFORMATION* lpInfomation = (FILE_NOTIFY_INFORMATION*)ptr;
				if (lpInfomation->Action == FILE_ACTION_MODIFIED) {
					wchar_t filename[MAX_PATH];
					memcpy(filename, lpInfomation->FileName, lpInfomation->FileNameLength);
					filename[lpInfomation->FileNameLength / 2] = L'\0';
					std::wstring path = m_path + filename;
					DWORD attr = ::GetFileAttributesW(path.c_str());
					if (!(attr & FILE_ATTRIBUTE_DIRECTORY)) {
						size_t pos = path.rfind(L'\\');
						if (pos != std::wstring::npos) {
							path = path.substr(0, pos);
						}
					}
					path += L"\\";
					if (std::find(m_paths.begin(), m_paths.end(), path) == m_paths.end()) {
						m_paths.push_back(path);
					}
				}
				if (lpInfomation->NextEntryOffset == 0) {
					break;
				}
				ptr += lpInfomation->NextEntryOffset;
			}
		}
	}

	m_paths.clear();

	delete [] buffer;
}

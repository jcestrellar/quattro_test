/*
 * @(#)NetServiceDiscovery.cpp
 *
 * Copyright 2023 Roland Corporation, Japan. All rights reserved.
 */

#include <ws2tcpip.h>
#include "NetServiceDiscovery.h"

static void WINAPI _browseCallback(const DWORD status, void *context, DNS_RECORD *records)
{
	NetServiceDiscovery* _this = (NetServiceDiscovery*)context;

	switch (status) {
		case ERROR_SUCCESS:
			if (records) {
				_this->resolved(records);
				::DnsRecordListFree(records, DnsFreeRecordList);
			}
			break;
		case ERROR_CANCELLED:
			_this->stopped(ERROR_SUCCESS);
			break;
		default:
			_this->stopped(status);
			break;
	}
}

bool NetServiceDiscovery::search(const CString queryName)
{
	if (mp_cancel) return false;

	CString _queryName = queryName + TEXT("local");
	DNS_SERVICE_BROWSE_REQUEST request;
	request.Version         = DNS_QUERY_REQUEST_VERSION1;
	request.InterfaceIndex  = 0;
	request.QueryName       = _queryName;
	request.pBrowseCallback = _browseCallback;
	request.pQueryContext   = this;
	DNS_STATUS ret = ::DnsServiceBrowse(&request, (mp_cancel = new DNS_SERVICE_CANCEL()));
	if (ret != DNS_REQUEST_PENDING) {
		stopped(ret);
	}
	return true;
}

void NetServiceDiscovery::stop()
{
	if (mp_cancel) {
		::DnsServiceBrowseCancel(mp_cancel);
	}
}

void NetServiceDiscovery::stopped(const DWORD errorCode)
{
	m_services.clear();
	delete mp_cancel;
	mp_cancel = 0;

	if (mp_delegate) {
		mp_delegate->netServiceDidStopSearch(errorCode);
	}
}

void NetServiceDiscovery::resolved(const DNS_RECORD *records)
{
	CString name;
	CString addr;
	int port = 0;

	for (auto cur = records; cur; cur = cur->pNext) {
		if (cur->wType == DNS_TYPE_PTR) {
			CString _name = cur->Data.PTR.pNameHost;
			int pos = _name.Find(TEXT("."));
			name = (pos > 0) ? _name.Left(pos) : _name;
			for (std::vector<CString>::iterator iter = m_services.begin(); iter != m_services.end(); iter++) {
				CString service = *iter;
				if (service == name) {
					return; /* already exists */
				}
			}
			continue;
		}
		if (cur->wType == DNS_TYPE_SRV) {
			port = (int)cur->Data.SRV.wPort;
			continue;
		}
		if (cur->wType == DNS_TYPE_A) {
			struct in_addr sin_addr;
			sin_addr.s_addr = cur->Data.A.IpAddress;
			char buf[32];
			addr = inet_ntop(AF_INET, &sin_addr, buf, sizeof(buf));
			continue;
		}
	}

	if (mp_delegate && !addr.IsEmpty() && port) {
		m_services.push_back(name);
		mp_delegate->netServiceDidResolve(name, addr, port);
	}
}

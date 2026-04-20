/*
 * @(#)MIDIInputPort.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "MIDIClient.h"

void MIDIInputPort::getDevices(std::vector<MIDI_ENDPOINT_INFO>& devs)
{
	devs.clear();

	UINT id, numDevs = ::midiInGetNumDevs();
	for (id = 0; id < numDevs; id++) {
		MIDIINCAPS caps;
		UINT status = ::midiInGetDevCaps(id, &caps, sizeof(caps));
		if (status != MMSYSERR_NOERROR) {
			continue;
		}
		CString ifname = getInterface(id);

		MIDI_ENDPOINT_INFO ep;
		ep.name = caps.szPname;
		ep.entity = caps.szPname;
		ep.uid = caps.szPname + ifname;
		ep.index = (ifname.IsEmpty() ? caps.szPname : ifname);
		devs.push_back(ep);
	}
}

CString MIDIInputPort::getInterface(UINT id)
{
	CString ifname;

	DWORD size = 0;
	MMRESULT error = midiInMessage((HMIDIIN)(size_t)id, DRV_QUERYDEVICEINTERFACESIZE, (DWORD_PTR)&size, 0);
	if (error != MMSYSERR_NOERROR || size == 0) {
		return ifname;
	}

	WCHAR *data = new WCHAR[(size / sizeof(WCHAR)) + 1];
	error = midiInMessage((HMIDIIN)(size_t)id, DRV_QUERYDEVICEINTERFACE, (DWORD_PTR)data, size);
	if ((error == MMSYSERR_NOERROR) && (data[0] != L'\0')) {
		ifname = CString(data);
#ifdef SUPPORT_VMIDI_CHANGED
		mp_client->checkVirtualDevice(data);
#endif
	}
	delete [] data;

	return ifname;
}

const std::vector<MIDI_ENDPOINT_INFO>& MIDIInputPort::endpoints()
{
	getDevices(m_devs);
	return m_devs;
}

void MIDIInputPort::connectEndpoint(const MIDI_ENDPOINT_INFO* ep)
{
	MIDIInputEndpoint* in = 0;

	if (ep != NULL) {

		UINT id, numDevs = ::midiInGetNumDevs();
		for (id = 0; id < numDevs; id++) {
			MIDIINCAPS caps;
			UINT status = ::midiInGetDevCaps(id, &caps, sizeof(caps));
			if ((status != MMSYSERR_NOERROR) || (ep->name != caps.szPname)) {
				continue;
			}
			if (ep->uid == (ep->name + getInterface(id))) {
				break;
			}
		}

		if (id < numDevs) {
			std::map<CString, MIDIInputEndpoint*>::iterator iter = m_endpoints.find(ep->uid);
			if (iter != m_endpoints.end()) {
				in = iter->second;
				if (in->open(id)) {
					return;
				}
				m_endpoints.erase(iter);
			} else {
				in = new MIDIInputEndpoint(this);
				if (in->open(id)) {
					m_endpoints.insert(std::make_pair(ep->uid, in));
					return;
				}
			}
		}
	}

	delete in;

	if (mp_client->mp_delegate)
		mp_client->mp_delegate->midiInputPortConnectFailed(ep);
}

void MIDIInputPort::connectAllEndpoints()
{
	std::vector<MIDI_ENDPOINT_INFO> devs;
	getDevices(devs);

	std::vector<MIDI_ENDPOINT_INFO>::iterator iter;
	for (iter = devs.begin(); iter != devs.end(); iter++) {
		MIDI_ENDPOINT_INFO in = *iter;
		connectEndpoint(&in);
	}
}

void MIDIInputPort::disconnectEndpoint(const MIDI_ENDPOINT_INFO* ep)
{
	if (ep == NULL) return;

	std::map<CString, MIDIInputEndpoint*>::iterator iter = m_endpoints.find(ep->uid);
	if (iter != m_endpoints.end()) {
		MIDIInputEndpoint* in = iter->second;
		delete in;
		m_endpoints.erase(iter);
	}
}

void MIDIInputPort::disconnectAllEndpoints()
{
	std::map<CString, MIDIInputEndpoint*>::iterator iter = m_endpoints.begin();
	while (iter != m_endpoints.end()) {
		MIDIInputEndpoint* in = iter->second;
		delete in;
		iter = m_endpoints.erase(iter);
	}
}

/*
 * @(#)MIDIOutputPort.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "MIDIClient.h"

void MIDIOutputPort::getDevices(std::vector<MIDI_ENDPOINT_INFO>& devs)
{
	devs.clear();

	UINT id, numDevs = ::midiOutGetNumDevs();
	for (id = 0; id < numDevs; id++) {
		MIDIOUTCAPS caps;
		UINT status = ::midiOutGetDevCaps(id, &caps, sizeof(caps));
		if (status != MMSYSERR_NOERROR) {
			continue;
		}
#ifndef ENABLE_MICROSOFT_GS
		if (!_tcscmp(caps.szPname, TEXT("Microsoft GS Wavetable Synth"))) {
			continue;
		}
#endif
		CString ifname = getInterface(id);

		MIDI_ENDPOINT_INFO ep;
		ep.name = caps.szPname;
		ep.entity = caps.szPname;
		ep.uid = caps.szPname + ifname;
		ep.index = (ifname.IsEmpty() ? caps.szPname : ifname);
		devs.push_back(ep);
	}

#ifdef USE_TGIF
	if (TGIF::available()) {
		CString ifname;
		ifname.Format(TEXT("(%X)"), DEVID_TGIF);

		MIDI_ENDPOINT_INFO ep;
		ep.name = TGIF::getDevName();
		ep.entity = ep.name;
		ep.uid = ep.name + ifname;
		ep.index = ep.name;
		devs.push_back(ep);
	}
#endif
}

CString MIDIOutputPort::getInterface(UINT id)
{
	CString ifname;

	DWORD size = 0;
	MMRESULT error = midiOutMessage((HMIDIOUT)(size_t)id, DRV_QUERYDEVICEINTERFACESIZE, (DWORD_PTR)&size, 0);
	if (error != MMSYSERR_NOERROR || size == 0) {
		return ifname;
	}

	WCHAR *data = new WCHAR[(size / sizeof(WCHAR)) + 1];
	error = midiOutMessage((HMIDIOUT)(size_t)id, DRV_QUERYDEVICEINTERFACE, (DWORD_PTR)data, size);
	if ((error == MMSYSERR_NOERROR) && (data[0] != L'\0')) {
		ifname = CString(data);
#ifdef SUPPORT_VMIDI_CHANGED
		mp_client->checkVirtualDevice(data);
#endif
	}
	delete [] data;

	return ifname;
}

const std::vector<MIDI_ENDPOINT_INFO>& MIDIOutputPort::endpoints()
{
	getDevices(m_devs);
	return m_devs;
}

void MIDIOutputPort::connectEndpoint(const MIDI_ENDPOINT_INFO* ep)
{
	MIDIOutputEndpoint* out = 0;

	if (ep != NULL) {

		int id, numDevs = ::midiOutGetNumDevs();
		for (id = 0; id < numDevs; id++) {
			MIDIOUTCAPS caps;
			UINT status = ::midiOutGetDevCaps(id, &caps, sizeof(caps));
			if ((status != MMSYSERR_NOERROR) || (ep->name != caps.szPname)) {
				continue;
			}
			if (ep->uid == (ep->name + getInterface(id))) {
				break;
			}
		}

#ifdef USE_TGIF
		if ((id == numDevs) && TGIF::available()) {
			CString ifname;
			ifname.Format(TEXT("(%X)"), DEVID_TGIF);
			if (ep->uid == (TGIF::getDevName() + ifname)) {
				numDevs = DEVID_TGIF;
			}
		}
#endif

		if (id < numDevs) {
			mutex_lock obj(mtx_endpoints);
			std::map<CString, MIDIOutputEndpoint*>::iterator iter = m_endpoints.find(ep->uid);
			if (iter != m_endpoints.end()) {
				out = iter->second;
				if (out->open(id)) {
					return;
				}
				m_endpoints.erase(iter);
			} else {
#ifdef USE_TGIF
				if (numDevs == DEVID_TGIF) {
					out = new TGIFOutputEndpoint();
				} else {
					out = new MIDIOutputEndpoint();
				}
#else
				out = new MIDIOutputEndpoint();
#endif
				if (out->open(id)) {
					m_endpoints.insert(std::make_pair(ep->uid, out));
					return;
				}
			}
		}
	}

	delete out;

	if (mp_client->mp_delegate)
		mp_client->mp_delegate->midiOutputPortConnectFailed(ep);
}

void MIDIOutputPort::connectAllEndpoints()
{
	std::vector<MIDI_ENDPOINT_INFO> devs;
	getDevices(devs);

	std::vector<MIDI_ENDPOINT_INFO>::iterator iter;
	for (iter = devs.begin(); iter != devs.end(); iter++) {
		MIDI_ENDPOINT_INFO out = *iter;
		connectEndpoint(&out);
	}
}

void MIDIOutputPort::disconnectEndpoint(const MIDI_ENDPOINT_INFO* ep)
{
	if (ep == NULL) return;

	mutex_lock obj(mtx_endpoints);

	std::map<CString, MIDIOutputEndpoint*>::iterator iter = m_endpoints.find(ep->uid);
	if (iter != m_endpoints.end()) {
		MIDIOutputEndpoint* out = iter->second;
		delete out;
		m_endpoints.erase(iter);
	}
}

void MIDIOutputPort::disconnectAllEndpoints()
{
	mutex_lock obj(mtx_endpoints);

	std::map<CString, MIDIOutputEndpoint*>::iterator iter = m_endpoints.begin();
	while (iter != m_endpoints.end()) {
		MIDIOutputEndpoint* out = iter->second;
		delete out;
		iter = m_endpoints.erase(iter);
	}
}

void MIDIOutputPort::send(const BYTE* data, int datalen)
{
	if (data == 0 || datalen <= 0) return;

	while (datalen > 0) {

		BYTE sts;
		if ((*data & 0x80) != 0) {
			sts = *data++; datalen--;
		} else {
			sts = m_running;
		}

		int len = 0;
		switch (sts & 0xf0) {
			case 0x80: len = 3; m_running = sts; break;
			case 0x90: len = 3; m_running = sts; break;
			case 0xa0: len = 3; m_running = sts; break;
			case 0xb0: len = 3; m_running = sts; break;
			case 0xc0: len = 2; m_running = sts; break;
			case 0xd0: len = 2; m_running = sts; break;
			case 0xe0: len = 3; m_running = sts; break;
			case 0xf0:
				switch (sts) {
					case 0xf0: m_running = 1; break;
					case 0xf7: m_running = 0; break;

					case 0xf1: len = 2; break;
					case 0xf2: len = 3; break;
					case 0xf3: len = 2; break;
					case 0xf6: len = 1; break;

					case 0xf8:
					case 0xfa:
					case 0xfb:
					case 0xfc:
					case 0xfe:
					case 0xff: len = 1; break;

					default: continue;
				}
				break;
		}

		if (len > 0) {
			BYTE msg[3] = { sts, 0, 0 };
			if (len > 1) { msg[1] = (*data++) & 0x7f; datalen--; }
			if (len > 2) { msg[2] = (*data++) & 0x7f; datalen--; }
			send(msg, len, false);
		} else if (sts == 0xf0) {
			m_buflen = 0;
			m_buf[m_buflen++] = sts;
		} else if (sts == 0xf7) {
			if (m_buflen > 0) {
				m_buf[m_buflen++] = sts;
				send(m_buf, m_buflen, true);
				m_buflen = 0;
			}
        } else {
			if (m_running && m_buflen < (kSysexBufSize - 1)) {
				m_buf[m_buflen++] = *data;
			}
			data++; datalen--;
		}
	}

}

void MIDIOutputPort::send(const BYTE* data, int datalen, bool sysex)
{
	mutex_lock obj(mtx_endpoints);

	std::map<CString, MIDIOutputEndpoint*>::iterator iter = m_endpoints.begin();
	for ( ; iter != m_endpoints.end(); iter++) {
		MIDIOutputEndpoint* out = iter->second;
		MMRESULT error = sysex ? out->sendSysex(data, datalen) : out->send(data, datalen);
		if (error != MMSYSERR_NOERROR) {
			out->close();
			if (mp_client->mp_delegate)
				mp_client->mp_delegate->midiErrorDidOccur(error);
		}
	}
}

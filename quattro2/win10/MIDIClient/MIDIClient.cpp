/*
 * @(#)MIDIClient.cpp
 *
 * Copyright 2013 Roland Corporation, Japan. All rights reserved.
 */

#include "MIDIClient.h"

const TCHAR* const MIDIDeviceNameKey    = TEXT("MIDIDeviceNameKey");
const TCHAR* const MIDIEntityNameKey    = TEXT("MIDIEntityNameKey");
const TCHAR* const MIDIEndpointUIDKey   = TEXT("MIDIEndpointUIDKey");
const TCHAR* const MIDIEndpointIndexKey = TEXT("MIDIEndpointIndexKey");

void MIDIClient::checkDevices()
{
	UINT numDevs;

	numDevs = ::midiInGetNumDevs();
	if (m_numInDevs != numDevs) {
		m_numInDevs = numDevs;
		m_changed = true;
	}
	numDevs = ::midiOutGetNumDevs();
	if (m_numOutDevs != numDevs) {
		m_numOutDevs = numDevs;
		m_changed = true;
	}
	if (m_changed && mp_delegate) {
		mp_delegate->midiObjectAddedRemoved();
		m_changed = false;
	}
}

#ifdef SUPPORT_VMIDI_CHANGED
static DWORD WINAPI CMNotifyCallback(
	HCMNOTIFICATION hNotify,
	PVOID Context,
	CM_NOTIFY_ACTION Action,
	PCM_NOTIFY_EVENT_DATA EventData, DWORD EventDataSize)
{
	switch (Action) {
		case CM_NOTIFY_ACTION_DEVICEINTERFACEARRIVAL:
		case CM_NOTIFY_ACTION_DEVICEINTERFACEREMOVAL: {
			MIDIClientDelegate* delegate = ((MIDIClient*)Context)->delegate();
			if (delegate) {
				delegate->midiObjectAddedRemoved();
			}
			break;
		}
		default:
			break;
	}
	return ERROR_SUCCESS;
}

void MIDIClient::checkVirtualDevice(wchar_t* data)
{
	std::wstring ifname = data;
	std::wregex re(L"\\\\\\\\\\?\\\\root#.+(\\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\}).*");
	std::wsmatch m;
	if (std::regex_match(ifname, m, re)) {
		std::wstring guid = m[1].str();
		std::map<std::wstring, HCMNOTIFICATION>::iterator iter = m_notifications.find(guid);
		if (iter == m_notifications.end()) {
			HCMNOTIFICATION hcmn = nullptr;
			CM_NOTIFY_FILTER filter = { 0 };
			filter.cbSize = sizeof(filter);
			filter.FilterType = CM_NOTIFY_FILTER_TYPE_DEVICEINTERFACE;
			if (::CLSIDFromString(guid.c_str(), &filter.u.DeviceInterface.ClassGuid) == NOERROR) {
				CONFIGRET ret = ::CM_Register_Notification(&filter, this, (PCM_NOTIFY_CALLBACK)&CMNotifyCallback, &hcmn);
				if (ret == CR_SUCCESS) {
					m_notifications.insert(std::make_pair(guid, hcmn));
				}
			}
		}
	}
}
#endif /* SUPPORT_VMIDI_CHANGED */

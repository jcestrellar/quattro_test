//
// @(#)RWCMIDIService.cpp
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#include "RWCConnection.h"

RWCMIDIService::RWCMIDIService(RWCConnection* conn)
{
	mp_connection = conn;
	mp_delegate = 0;

	m_streaming = false;
	m_streamingDelayTime = kDefaultStreamingDelayTime;

	memset(_sysexSize, 0, sizeof(_sysexSize));
}

void RWCMIDIService::streamingDelayTime(float sec)
{
	m_streamingDelayTime = sec;

	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER *)buf;
	header->type	= RNP_TYPE_MIDI_STREAMING;
	header->subtype = RNP_SUBTYPE_0;
	header->size[0] = 0;
	header->size[1] = sizeof(RNP_DELAY_TIME);

	DWORD msec = (DWORD)(sec * 1000);

	RNP_DELAY_TIME *data = (RNP_DELAY_TIME *)(buf + sizeof(RNP_HEADER));
	data->msec[0] = (unsigned char)(msec >> 24);
	data->msec[1] = (unsigned char)(msec >> 16);
	data->msec[2] = (unsigned char)(msec >>  8);
	data->msec[3] = (unsigned char)(msec);

	mp_connection->writeToServer(buf);
}

void RWCMIDIService::parse(RNP_MIDI_PACKET* packet, int length)
{
	if (mp_delegate == 0 || packet == 0 || length <= 0)
		return;

	DWORD time = (packet->timeStamp.msec[0] << 24) |
				 (packet->timeStamp.msec[1] << 16) |
				 (packet->timeStamp.msec[2] <<	8) |
				 (packet->timeStamp.msec[3]);

	USB_MIDI_PACKET* pmidi = packet->pmidi;

	int datalen;
	int packets = (length - sizeof(RNP_TIMESTAMP)) / sizeof(USB_MIDI_PACKET);

	for ( ; packets > 0; packets--, pmidi++) {
		datalen = 0;
		switch (pmidi->data[0] & 0xf0) {
			case 0x80: datalen = 3; break;
			case 0x90: datalen = 3; break;
			case 0xa0: datalen = 3; break;
			case 0xb0: datalen = 3; break;
			case 0xc0: datalen = 2; break;
			case 0xd0: datalen = 2; break;
			case 0xe0: datalen = 3; break;
			case 0xf0:
				switch (pmidi->data[0]) {
					case 0xf1: datalen = 2; break;
					case 0xf2: datalen = 3; break;
					case 0xf3: datalen = 2; break;

					case 0xf6:
					case 0xf8:
					case 0xfa:
					case 0xfb:
					case 0xfc:
					case 0xfe:
					case 0xff: datalen = 1; break;
				}
				break;
		}

		int cable = (pmidi->head & 0xf0) >> 4;
		if (datalen) {
			mp_delegate->midiInputMessage(pmidi->data, datalen, time, cable);
		} else {
			unsigned char *data = _sysexData[cable] + _sysexSize[cable];
			switch (pmidi->head & 0x0f) {
				case 4:
					data[0] = pmidi->data[0];
					data[1] = pmidi->data[1];
					data[2] = pmidi->data[2];
					_sysexSize[cable] += 3;
					break;

				case 5:
					data[0] = pmidi->data[0];
					_sysexSize[cable] += 1;
					mp_delegate->midiInputMessage(_sysexData[cable], _sysexSize[cable], time, cable);
					_sysexSize[cable] = 0;
					break;

				case 6:
					data[0] = pmidi->data[0];
					data[1] = pmidi->data[1];
					_sysexSize[cable] += 2;
					mp_delegate->midiInputMessage(_sysexData[cable], _sysexSize[cable], time, cable);
					_sysexSize[cable] = 0;
					break;

				case 7:
					data[0] = pmidi->data[0];
					data[1] = pmidi->data[1];
					data[2] = pmidi->data[2];
					_sysexSize[cable] += 3;
					mp_delegate->midiInputMessage(_sysexData[cable], _sysexSize[cable], time, cable);
					_sysexSize[cable] = 0;
					break;
			}
		}
	}
}

void RWCMIDIService::send(const BYTE* data, int bytes, int cable)
{
	if (cable < 0 || cable >= MAX_CABLE_NUM)
		return;
	if (data == 0 || bytes <= 0 || bytes >= (MIDI_BUFSIZ * 3 / 4))
		return;

	RNP_HEADER *header = (RNP_HEADER *)_buffer;
	header->type    = RNP_TYPE_MIDI_PACKET;
	header->subtype = RNP_SUBTYPE_0;

	RNP_MIDI_PACKET* packet = (RNP_MIDI_PACKET*)(_buffer + sizeof(RNP_HEADER));

	if (m_streaming) {
		DWORD time = Timer::currentMSecTimestamp();
		if (time == 0) time = 1;
		packet->timeStamp.msec[0] = (unsigned char)(time >> 24);
		packet->timeStamp.msec[1] = (unsigned char)(time >> 16);
		packet->timeStamp.msec[2] = (unsigned char)(time >>  8);
		packet->timeStamp.msec[3] = (unsigned char)(time >>  0);
	} else {
		memset(&packet->timeStamp, 0, sizeof(RNP_TIMESTAMP));
	}

	unsigned char cin = 0;
	switch (data[0] & 0xf0) {
		case 0x80: cin = 0x8; break;
		case 0x90: cin = 0x9; break;
		case 0xa0: cin = 0xa; break;
		case 0xb0: cin = 0xb; break;
		case 0xc0: cin = 0xc; break;
		case 0xd0: cin = 0xd; break;
		case 0xe0: cin = 0xe; break;
		case 0xf0:
			switch (data[0]) {
				case 0xf1: cin = 0x2; break;
				case 0xf2: cin = 0x3; break;
				case 0xf3: cin = 0x2; break;

				case 0xf6: cin = 0x5; break;

				case 0xf8:
				case 0xfa:
				case 0xfb:
				case 0xfc:
				case 0xfe:
				case 0xff: cin = 0xf; break;
			}
			break;
	}

	int packets = 0;

	if (cin) {

		packets = 1;

		packet->pmidi[0].head = (BYTE)((cable << 4) | cin);
		packet->pmidi[0].data[0] = data[0];
		packet->pmidi[0].data[1] = data[1];
		packet->pmidi[0].data[2] = data[2];

	} else if (data[0] == 0xf0) {

		USB_MIDI_PACKET* pmidi = packet->pmidi;
		for ( ; bytes > 0; bytes -= 3, pmidi++, packets++) {
			pmidi->data[0] = *data++;
			pmidi->data[1] = *data++;
			pmidi->data[2] = *data++;
			if (bytes > 3)
				cin = 4;
			else if (bytes == 1)
				cin = 5;
			else if (bytes == 2)
				cin = 6;
			else if (bytes == 3)
				cin = 7;
			pmidi->head = (BYTE)((cable << 4) | cin);
		}

	}

	int size = sizeof(RNP_TIMESTAMP) + (sizeof(USB_MIDI_PACKET) * packets);
	header->size[0] = (unsigned char)(size >> 8);
	header->size[1] = (unsigned char)(size);

	mp_connection->writeToServer(_buffer);
}

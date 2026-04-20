//
// @(#)RWCAudioOutputStream.cpp
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#include "RWCConnection.h"

RWCAudioOutputStream::RWCAudioOutputStream(RWCConnection* conn)
{
	mp_connection = conn;
	mp_delegate = 0;

	_length = _offset = 0;

	memset(&m_wfe, 0, sizeof(m_wfe));
	m_wfe.wFormatTag      = WAVE_FORMAT_PCM;
	m_wfe.nSamplesPerSec  = (DWORD)kRWCSampleRate;
	m_wfe.nChannels       = kRWCNumOfChannels;
	m_wfe.wBitsPerSample  = (kRWCBytesPerFrame / kRWCNumOfChannels) * 8;
	m_wfe.nBlockAlign     = kRWCBytesPerFrame;
	m_wfe.nAvgBytesPerSec = kRWCBytesPerFrame * m_wfe.nSamplesPerSec;
}

void RWCAudioOutputStream::start(LPCTSTR)
{
	acceptConnection();

	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER*)buf;
	header->type    = RNP_TYPE_AUDIO_CONTROL;
	header->subtype = RNP_SUBTYPE_OUTPUT_START;
	header->size[0] = 0;
	header->size[1] = 2;

	RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL*)(buf + sizeof(RNP_HEADER));
	data->value[0] = (unsigned char)(portNo() >> 8);
	data->value[1] = (unsigned char)(portNo());

	mp_connection->writeToServer(buf);
}

void RWCAudioOutputStream::pause()
{
    BYTE buf[16];

    RNP_HEADER *header = (RNP_HEADER*)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_OUTPUT_PAUSE;
    header->size[0] = 0;
    header->size[1] = 0;

	mp_connection->writeToServer(buf);
}

void RWCAudioOutputStream::stop()
{
    BYTE buf[16];

    RNP_HEADER *header = (RNP_HEADER*)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_OUTPUT_STOP;
    header->size[0] = 0;
    header->size[1] = 0;

	mp_connection->writeToServer(buf);

	stopConnection();
}

int RWCAudioOutputStream::status() const
{
	if (connecting()) {
		return mp_connection->_audioStatus.output.status;
	}
	return RNP_AUDIO_STATUS_STOP;
}

int RWCAudioOutputStream::numberOfChannels() const
{
	return kRWCNumOfChannels;
}

float RWCAudioOutputStream::currentTime() const
{
	DWORD currentDeviceFrame =
		(mp_connection->_audioStatus.output.frame[0] << 24) |
		(mp_connection->_audioStatus.output.frame[1] << 16) |
		(mp_connection->_audioStatus.output.frame[2] <<  8) |
		(mp_connection->_audioStatus.output.frame[3] <<  0);

	return (float)(currentDeviceFrame / kRWCSampleRate);
}

float RWCAudioOutputStream::volume() const
{
	return (float)(mp_connection->_audioStatus.output.volume / 127.0);
}

void RWCAudioOutputStream::volume(float gain)
{
	if (gain < 0 || gain > 1.0)
		return;

	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER*)buf;
	header->type    = RNP_TYPE_AUDIO_CONTROL;
	header->subtype = RNP_SUBTYPE_OUTPUT_VOLUME;
	header->size[0] = 0;
	header->size[1] = 1;

	RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL*)(buf + sizeof(RNP_HEADER));
	data->value[0] = (unsigned char)(gain * 127);

	mp_connection->writeToServer(buf);
}

float RWCAudioOutputStream::peakPowerForChannel(int channelNumber) const
{
	if (channelNumber < 0 || channelNumber >= kRWCNumOfChannels)
		return 0;

	return mp_connection->outputLevel(channelNumber);
}

void RWCAudioOutputStream::streamOpenCompleted()
{
	_length = _offset = 0;
}

bool RWCAudioOutputStream::streamRunLoop(Socket* socket)
{
	if (mp_delegate == 0)
		return false;

	if (_length == 0) {
		_offset = 0;
		_length = mp_delegate->outputStream(_buffer, sizeof(_buffer));
	}

	int len = socket->send(_buffer + _offset, _length);
	if (len <= 0) {
		return false;
	}

	_length -= len;
	_offset += len;

	return true;
}

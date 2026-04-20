//
// @(#)RWCInputStream.cpp
//
// Copyright 2013 Roland Corporation. All rights reserved.
//

#include "RWCConnection.h"

RWCAudioInputStream::RWCAudioInputStream(RWCConnection* conn)
{
	mp_connection = conn;
	mp_delegate = 0;
	m_inputMode = RNP_INPUT_MODE_MIX;

	_offset = 0;

	memset(&m_wfe, 0, sizeof(m_wfe));
	m_wfe.wFormatTag      = WAVE_FORMAT_PCM;
	m_wfe.nSamplesPerSec  = (DWORD)kRWCSampleRate;
	m_wfe.nChannels       = kRWCNumOfChannels;
	m_wfe.wBitsPerSample  = (kRWCBytesPerFrame / kRWCNumOfChannels) * 8;
	m_wfe.nBlockAlign     = kRWCBytesPerFrame;
	m_wfe.nAvgBytesPerSec = kRWCBytesPerFrame * m_wfe.nSamplesPerSec;
}

void RWCAudioInputStream::inputMode(int mode)
{
	m_inputMode = mode;

	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER *)buf;
	header->type    = RNP_TYPE_AUDIO_CONTROL;
	header->subtype = RNP_SUBTYPE_INPUT_MODE;
	header->size[0] = 0;
	header->size[1] = 1;

	RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL *)(buf + sizeof(RNP_HEADER));
	data->value[0] = (unsigned char)mode;

	mp_connection->writeToServer(buf);
}

void RWCAudioInputStream::start(LPCTSTR)
{
	acceptConnection();

	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER *)buf;
	header->type    = RNP_TYPE_AUDIO_CONTROL;
	header->subtype = RNP_SUBTYPE_INPUT_START;
	header->size[0] = 0;
	header->size[1] = 2;

	RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL *)(buf + sizeof(RNP_HEADER));
	data->value[0] = (unsigned char)(portNo() >> 8);
	data->value[1] = (unsigned char)(portNo());

	mp_connection->writeToServer(buf);
}

void RWCAudioInputStream::pause()
{
	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER *)buf;
	header->type    = RNP_TYPE_AUDIO_CONTROL;
	header->subtype = RNP_SUBTYPE_INPUT_PAUSE;
	header->size[0] = 0;
	header->size[1] = 0;

	mp_connection->writeToServer(buf);
}

void RWCAudioInputStream::stop(bool shouldStopImmediate)
{
	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER *)buf;
	header->type    = RNP_TYPE_AUDIO_CONTROL;
	header->subtype = RNP_SUBTYPE_INPUT_STOP;
	header->size[0] = 0;
	header->size[1] = 0;

	mp_connection->writeToServer(buf);

	if (shouldStopImmediate) {
		stopConnection();
	}
}

int RWCAudioInputStream::status() const
{
	if (connecting()) {
		return mp_connection->_audioStatus.input.status;
	}
    return RNP_AUDIO_STATUS_STOP;
}

int RWCAudioInputStream::numberOfChannels() const
{
	return kRWCNumOfChannels;
}

float RWCAudioInputStream::currentTime() const
{
	DWORD currentDeviceFrame =
		(mp_connection->_audioStatus.input.frame[0] << 24) |
		(mp_connection->_audioStatus.input.frame[1] << 16) |
		(mp_connection->_audioStatus.input.frame[2] <<  8) |
		(mp_connection->_audioStatus.input.frame[3] <<  0);

	return (float)(currentDeviceFrame / kRWCSampleRate);
}

float RWCAudioInputStream::volume() const
{
	return (float)(mp_connection->_audioStatus.input.volume / 127.0);
}

void RWCAudioInputStream::volume(float gain)
{
	if (gain < 0 || gain > 1.0)
		return;

	BYTE buf[16];

	RNP_HEADER *header = (RNP_HEADER *)buf;
	header->type    = RNP_TYPE_AUDIO_CONTROL;
	header->subtype = RNP_SUBTYPE_INPUT_VOLUME;
	header->size[0] = 0;
	header->size[1] = 1;

	RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL *)(buf + sizeof(RNP_HEADER));
	data->value[0] = (unsigned char)(gain * 127);

	mp_connection->writeToServer(buf);
}

float RWCAudioInputStream::peakPowerForChannel(int channelNumber) const
{
    if (channelNumber < 0 || channelNumber >= kRWCNumOfChannels)
        return 0;

    return mp_connection->inputLevel(channelNumber);
}

void RWCAudioInputStream::streamOpenCompleted()
{
	_offset = 0;
}

void RWCAudioInputStream::streamEndEncountered()
{
	if (mp_delegate)
		mp_delegate->inputStreamDidClosed();
}

bool RWCAudioInputStream::streamRunLoop(Socket* socket)
{
	if (mp_delegate == 0)
		return false;

	int len = socket->recv(_buffer + _offset, sizeof(_buffer) - _offset);
	if (len <= 0) {
		return false;
	}

	len += _offset;
	int frames = len / kRWCBytesPerFrame;
	if (frames) {
		mp_delegate->inputStream(_buffer, frames * kRWCBytesPerFrame);
	}

	_offset = len & (kRWCBytesPerFrame - 1);
	if (_offset) {
		int n = len & ~(kRWCBytesPerFrame - 1);
		for (int i = 0; i < _offset; i++)
			_buffer[i] = _buffer[n + i];
	}

	return true;
}

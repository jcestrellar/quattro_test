//
//	RWCConnection.cpp
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

#include "RWCConnection.h"
#include <assert.h>

RWCConnection::RWCConnection()
{
	mp_device = 0;
	mp_delegate = 0;

	resetAllParameters();

	mp_midiService = new RWCMIDIService(this);
	mp_inputStream = new RWCAudioInputStream(this);
	mp_outputStream = new RWCAudioOutputStream(this);
}

RWCConnection::~RWCConnection()
{
	stopConnection();

	delete mp_midiService;
	delete mp_inputStream;
	delete mp_outputStream;

	delete mp_device;
}

void RWCConnection::connect(const RWC_DEV_INFO* device)
{
	disconnect();

	if (device == 0) {
		streamOpenFailed();
		return;
	}

	*(mp_device = new RWC_DEV_INFO) = *device;

	mp_inputStream->startServer();
	mp_outputStream->startServer();
	connectToServer(mp_device->address, mp_device->portNo);
}

void RWCConnection::disconnect()
{
	stopConnection();
	mp_inputStream->stopServer();
	mp_outputStream->stopServer();

	resetAllParameters();

	delete mp_device;
	mp_device = 0;
}

void RWCConnection::resetAllParameters()
{
	memset(_timeStamp, 0, sizeof(_timeStamp));
	memset(&_audioStatus, 0, sizeof(_audioStatus));

	_audioStatus.output.peakPowerL =
	_audioStatus.output.peakPowerR =
	_audioStatus.input.peakPowerL =
	_audioStatus.input.peakPowerR = -120;

	_peakPower[0] = _peakPower[1] = _peakPower[2] = _peakPower[3] = -120.0;
}

void RWCConnection::updateMetsers()
{
	if (_peakPower[0] < _audioStatus.output.peakPowerL)
		_peakPower[0] = _audioStatus.output.peakPowerL;
	if (_peakPower[1] < _audioStatus.output.peakPowerR)
		_peakPower[1] = _audioStatus.output.peakPowerR;

	if (_peakPower[2] < _audioStatus.input.peakPowerL)
		_peakPower[2] = _audioStatus.input.peakPowerL;
	if (_peakPower[3] < _audioStatus.input.peakPowerR)
		_peakPower[3] = _audioStatus.input.peakPowerR;
}

float RWCConnection::outputLevel(int channelNumber)
{
	float peak;
	if (channelNumber == 0) {
		peak = _peakPower[0]; _peakPower[0] = _audioStatus.output.peakPowerL;
	} else {
		peak = _peakPower[1]; _peakPower[1] = _audioStatus.output.peakPowerR;
	}
	return peak;
}

float RWCConnection::inputLevel(int channelNumber)
{
	float peak;
	if (channelNumber == 0) {
		peak = _peakPower[2]; _peakPower[2] = _audioStatus.input.peakPowerL;
	} else {
		peak = _peakPower[3]; _peakPower[3] = _audioStatus.input.peakPowerR;
	}
	return peak;
}

bool RWCConnection::streamRunLoop(Socket* socket)
{
	RNP_HEADER header;

	int readByteSize = socket->recv(&header, sizeof(RNP_HEADER));
	if (readByteSize != sizeof(RNP_HEADER)) {
		return false;
	}

	int dataByteSize = (header.size[0] << 8) | header.size[1];
	if (dataByteSize >= NETREAD_BUF_SIZE) {
		return false;
	}

	readByteSize = socket->recv(_buffer, dataByteSize);
	if (readByteSize != dataByteSize) {
		return false;
	}

	switch (header.type) {
		case RNP_TYPE_KEEP_ALIVE:
			if (header.subtype == RNP_SUBTYPE_SET_TIMEOUT) {
				RNP_KEEP_ALIVE_TIMEOUT *timeout = (RNP_KEEP_ALIVE_TIMEOUT *)_buffer;
				m_keepAliveTimeout = timeout->seconds;
			}
			break;

		case RNP_TYPE_SYNC_TIMESTAMP:
			if ((RNP_SUBTYPE_SYNC_CONNECT <= header.subtype) && (header.subtype <= RNP_SUBTYPE_SYNC_INPUT_STOP)) {
				RNP_TIMESTAMP *timeStamp = (RNP_TIMESTAMP *)_buffer;
				_timeStamp[header.subtype] = (timeStamp->msec[0] << 24) |
											 (timeStamp->msec[1] << 16) |
											 (timeStamp->msec[2] <<  8) |
											 (timeStamp->msec[3]);
			}
			break;

		case RNP_TYPE_MIDI_PACKET: {
			RNP_MIDI_PACKET *packet = (RNP_MIDI_PACKET *)_buffer;
			mp_midiService->parse(packet, readByteSize);
			break;
		}

		case RNP_TYPE_AUDIO_STATUS:
			memcpy(&_audioStatus, _buffer, sizeof(RNP_AUDIO_STATUS));
			updateMetsers();
			break;

		default:
			break;
	}

	return true;
}

int RWCConnection::writeToServer(BYTE* buf)
{
	RNP_HEADER *header = (RNP_HEADER *)buf;
	int len = ((header->size[0] << 8) | header->size[1]) + sizeof(RNP_HEADER);
	return send(buf, len);
}

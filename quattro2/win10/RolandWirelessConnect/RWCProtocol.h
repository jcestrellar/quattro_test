//
//	RWCProtocol.h
//
//	Copyright 2013 Roland Corporation. All rights reserved.
//

#ifndef __RWC_PROTOCOL_H__
#define __RWC_PROTOCOL_H__

#define kRWCSampleRate				(44100.0)
#define kRWCNumOfChannels			(2)
#define kRWCBytesPerFrame			(sizeof(INT16) * kRWCNumOfChannels)

#define RWCDeviceDiscoveryPortNo	9314

#define kDefaultConnectTimeout		5
#define kDefaultKeepAliveTimeout	3
#define kDefaultStreamingDelayTime	1

typedef struct RNP_DEV_DISCOVERY
{
	unsigned char	header[6];
	unsigned char	port[2];

} RNP_DEV_DISCOVERY;

typedef struct RNP_DEV_INFO
{
	unsigned char	 header[6];
	unsigned char	 port[2];
	unsigned char	 serial[4];
	unsigned char	 caps;
	unsigned char	 image;
	unsigned char	 status;
	unsigned char	 reserved1[5];
	unsigned char	 manufacturer[16];
	unsigned char	 productCode[8];
	unsigned char	 productVersion[8];
	unsigned char	 name[16];
	unsigned char	 reserved2[16];

} RNP_DEV_INFO;

#define RNP_CAPS_MIDI_IN			 (0x01)
#define RNP_CAPS_MIDI_OUT			 (0x02)
#define RNP_CAPS_AUDIO_OUTPUT		 (0x04)
#define RNP_CAPS_AUDIO_INPUT		 (0x08)
#define RNP_CAPS_AUDIO_INPUT_MODE	 (0x10)
#define RNP_CAPS_MIDI_STREAMING 	 (0x80)

#define RNP_IMAGE_UNKNOWN			 ( 0)
#define RNP_IMAGE_PIANO 			 ( 1)
#define RNP_IMAGE_GRANDPIANO		 ( 2)
#define RNP_IMAGE_ORGAN 			 ( 3)
#define RNP_IMAGE_SYNTHESIZER		 ( 4)
#define RNP_IMAGE_ACCORDION 		 ( 5)
#define RNP_IMAGE_DRUM				 ( 6)
#define RNP_IMAGE_PERCUSSION_SAMPLER ( 7)
#define RNP_IMAGE_GUITAR			 ( 8)
#define RNP_IMAGE_MIXER 			 ( 9)
#define RNP_IMAGE_COMPUTER			 (10)

#define RNP_STATUS_LISTEN			 (0x00)
#define RNP_STATUS_SESSION			 (0x01)
#define RNP_STATUS_BUSY 			 (0x02)

typedef struct RNP_HEADER
{
	unsigned char	type;
	unsigned char	subtype;
	unsigned char	size[2];

} RNP_HEADER;

#define RNP_TYPE_KEEP_ALIVE 		(0)
#define RNP_TYPE_SYNC_TIMESTAMP 	(1)
#define RNP_TYPE_MIDI_PACKET		(2)
#define RNP_TYPE_AUDIO_STATUS		(3)
#define RNP_TYPE_AUDIO_CONTROL		(4)
#define RNP_TYPE_MIDI_STREAMING 	(7)

#define RNP_SUBTYPE_0				(0)

typedef struct RNP_KEEP_ALIVE_TIMEOUT
{
	unsigned char	seconds;

} RNP_KEEP_ALIVE_TIMEOUT;

#define RNP_SUBTYPE_SET_TIMEOUT 	(1)

typedef struct RNP_TIMESTAMP
{
	unsigned char	msec[4];

} RNP_TIMESTAMP;

typedef struct RNP_SYNC_TIMESTAMP
{
	RNP_TIMESTAMP  timeStamp;

} RNP_SYNC_TIMESTAMP;

#define RNP_SUBTYPE_SYNC_CONNECT	  (0)
#define RNP_SUBTYPE_SYNC_OUTPUT_START (1)
#define RNP_SUBTYPE_SYNC_OUTPUT_STOP  (2)
#define RNP_SUBTYPE_SYNC_INPUT_START  (3)
#define RNP_SUBTYPE_SYNC_INPUT_STOP   (4)

typedef struct USB_MIDI_PACKET
{
	unsigned char	head;
	unsigned char	data[3];

} USB_MIDI_PACKET;

typedef struct RNP_MIDI_PACKET
{
	RNP_TIMESTAMP	timeStamp;
	USB_MIDI_PACKET pmidi[1];

} RNP_MIDI_PACKET;

typedef struct NET_AUDIO_STATUS
{
	unsigned char	status;
	unsigned char	volume;
	signed char 	peakPowerL;
	signed char 	peakPowerR;
	unsigned char	frame[4];
	unsigned char	reserved[8];

} NET_AUDIO_STATUS;

#define RNP_AUDIO_STATUS_STOP		(0)
#define RNP_AUDIO_STATUS_START		(1)
#define RNP_AUDIO_STATUS_PAUSE		(2)

typedef struct RNP_AUDIO_STATUS
{
	NET_AUDIO_STATUS output;
	NET_AUDIO_STATUS input;

} RNP_AUDIO_STATUS;

typedef struct RNP_AUDIO_CONTROL
{
	unsigned char	value[2];

} RNP_AUDIO_CONTROL;

#define RNP_SUBTYPE_OUTPUT_START	( 1)
#define RNP_SUBTYPE_OUTPUT_PAUSE	( 2)
#define RNP_SUBTYPE_OUTPUT_STOP 	( 3)
#define RNP_SUBTYPE_INPUT_START 	( 4)
#define RNP_SUBTYPE_INPUT_PAUSE 	( 5)
#define RNP_SUBTYPE_INPUT_STOP		( 6)
#define RNP_SUBTYPE_OUTPUT_VOLUME	( 9)
#define RNP_SUBTYPE_INPUT_VOLUME	(10)
#define RNP_SUBTYPE_INPUT_MODE		(11)

#define RNP_INPUT_MODE_MIX			 0
#define RNP_INPUT_MODE_SOLO 		 1

typedef struct RNP_DELAY_TIME
{
	unsigned char	msec[4];

} RNP_DELAY_TIME;

#include <atlstr.h>

extern const TCHAR* const RWCDeviceAddressKey;
extern const TCHAR* const RWCDevicePortNoKey;
extern const TCHAR* const RWCDeviceUIDKey;
extern const TCHAR* const RWCDeviceCapsKey;
extern const TCHAR* const RWCDeviceImageKey;
extern const TCHAR* const RWCDeviceStatusKey;
extern const TCHAR* const RWCDeviceManufacturerKey;
extern const TCHAR* const RWCDeviceVersionKey;
extern const TCHAR* const RWCDeviceNameKey;

typedef struct RWC_DEV_INFO
{
	CString		address;
	int			portNo;
	CString		uid;
	int			caps;
	int			image;
	int			status;
	CString		manufacturer;
	CString		version;
	CString		name;

	RWC_DEV_INFO() : portNo(0), caps(0), image(0), status(0) { }

} RWC_DEV_INFO;

#endif /* __RWC_PROTOCOL_H__ */

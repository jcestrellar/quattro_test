//
//  RWCMIDIService.m
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import "RWCConnection.h"
#import "../MIDIClient/timestamp.h"

@interface RWCMIDIService () {

    RWCConnection *_connection;
    NSTimeInterval _streamingDelayTime;

    u_int8_t _buffer[512];
    u_int8_t _sysexData[16][512];
    int _sysexSize[16];
}

@end

@implementation RWCMIDIService

@synthesize delegate = _delegate;
@synthesize streaming = _streaming;

@dynamic streamingDelayTime;

- (id)initWithConnection:(RWCConnection *)connection
{
    if (self = [super init]) {
        _connection = connection;
        _streaming = NO;
        _streamingDelayTime = kDefaultStreamingDelayTime;
    }
    return self;
}

- (void)dealloc
{
    [super dealloc];
}

- (NSTimeInterval)streamingDelayTime
{
    return _streamingDelayTime;
}

- (void)setStreamingDelayTime:(NSTimeInterval)time
{
    _streamingDelayTime = time;

    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER *)buf;
    header->type    = RNP_TYPE_MIDI_STREAMING;
    header->subtype = RNP_SUBTYPE_0;
    header->size[0] = 0;
    header->size[1] = sizeof(RNP_DELAY_TIME);

    unsigned long msec = time * 1000;

    RNP_DELAY_TIME *data = (RNP_DELAY_TIME *)(buf + sizeof(RNP_HEADER));
    data->msec[0] = (unsigned char)(msec >> 24);
    data->msec[1] = (unsigned char)(msec >> 16);
    data->msec[2] = (unsigned char)(msec >>  8);
    data->msec[3] = (unsigned char)(msec);

    [_connection writeToServer:buf];
}

- (void)parse:(RNP_MIDI_PACKET*)packet size:(int)length
{
    if (![self.delegate respondsToSelector:@selector(midiInputMessage:size:timeStamp:cable:)]) {
        return;
    }

    u_int32_t time = (packet->timeStamp.msec[0] << 24) |
                     (packet->timeStamp.msec[1] << 16) |
                     (packet->timeStamp.msec[2] <<  8) |
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
            [self.delegate midiInputMessage:pmidi->data size:datalen timeStamp:time cable:cable];
        } else {
            unsigned char *data;
            switch (pmidi->head & 0x0f) {
                case 4:
                    data = _sysexData[cable] + _sysexSize[cable];
                    data[0] = pmidi->data[0];
                    data[1] = pmidi->data[1];
                    data[2] = pmidi->data[2];
                    _sysexSize[cable] += 3;
                    break;

                case 5:
                    data = _sysexData[cable] + _sysexSize[cable];
                    data[0] = pmidi->data[0];
                    _sysexSize[cable] += 1;
                    [self.delegate midiInputMessage:_sysexData[cable] size:_sysexSize[cable] timeStamp:time cable:cable];
                    _sysexSize[cable] = 0;
                    break;

                case 6:
                    data = _sysexData[cable] + _sysexSize[cable];
                    data[0] = pmidi->data[0];
                    data[1] = pmidi->data[1];
                    _sysexSize[cable] += 2;
                    [self.delegate midiInputMessage:_sysexData[cable] size:_sysexSize[cable] timeStamp:time cable:cable];
                    _sysexSize[cable] = 0;
                    break;

                case 7:
                    data = _sysexData[cable] + _sysexSize[cable];
                    data[0] = pmidi->data[0];
                    data[1] = pmidi->data[1];
                    data[2] = pmidi->data[2];
                    _sysexSize[cable] += 3;
                    [self.delegate midiInputMessage:_sysexData[cable] size:_sysexSize[cable] timeStamp:time cable:cable];
                    _sysexSize[cable] = 0;
                    break;
            }
        }
    }
}

- (void)send:(const u_int8_t *)data size:(int)bytes
{
    [self send:data size:bytes cable:0];
}

- (void)send:(const u_int8_t *)data size:(int)bytes cable:(int)cable
{
    if (data == NULL || bytes <= 0)
        return;

    RNP_HEADER *header = (RNP_HEADER *)_buffer;
    header->type    = RNP_TYPE_MIDI_PACKET;
    header->subtype = RNP_SUBTYPE_0;

    RNP_MIDI_PACKET* packet = (RNP_MIDI_PACKET*)(_buffer + sizeof(RNP_HEADER));

    if (self.streaming) {
        u_int32_t time = current_millis_timestamp();
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

        packet->pmidi[0].head = (unsigned char)((cable << 4) | cin);
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
            pmidi->head = (unsigned char)((cable << 4) | cin);
        }
    }

    int size = sizeof(RNP_TIMESTAMP) + (sizeof(USB_MIDI_PACKET) * packets);
    header->size[0] = (unsigned char)(size >> 8);
    header->size[1] = (unsigned char)(size);

    [_connection writeToServer:_buffer];
}

@end

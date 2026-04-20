//
//  RWCConnection.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import "RWCConnection.h"
#import "RWCProtocol.h"
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define NETREAD_BUF_SIZE    0x8000

@interface RWCConnection () {

    RWCNetClient *_client;
    u_int8_t _readBuffer[NETREAD_BUF_SIZE];
    u_int32_t _timeStamp[8];
    RNP_AUDIO_STATUS _audioStatus;
    float _peakPower[4];
}

- (void)resetAllParameters;
- (void)updateMetsers;

@end

@implementation RWCConnection

@synthesize delegate = _delegate;
@synthesize device = _device;
@synthesize midiService = _midiService;
@synthesize inputStream = _inputStream;
@synthesize outputStream = _outputStream;

@dynamic connectTimeout;
@dynamic keepAliveTimeout;

@dynamic connectStartTimeStamp;
@dynamic outputStartTimeStamp;
@dynamic outputStopTimeStamp;
@dynamic inputStartTimeStamp;
@dynamic inputStopTimeStamp;

@dynamic audioStatus;

- (id)init
{
    if (self = [super init]) {
        _midiService = [[RWCMIDIService alloc] initWithConnection:self];
        _inputStream  = [[RWCAudioInputStream alloc] initWithConnection:self];
        _outputStream = [[RWCAudioOutputStream alloc] initWithConnection:self];
        _client = [[RWCNetClient alloc] init];
        _client.delegate = self;
        [self resetAllParameters];
    }
    return self;
}

- (void)dealloc
{
    [self disconnect];

    [_midiService release];
    [_inputStream release];
    [_outputStream release];

    _client.delegate = nil;
    [_client release];
    [_device release];

    [super dealloc];
}

- (void)connect:(NSDictionary *)device
{
    [self disconnect];

    if (device == nil || ![device isKindOfClass:[NSDictionary class]]) {
        [self streamOpenFailed];
        return;
    }
    
    _device = [[NSDictionary alloc] initWithDictionary:device];

    [_inputStream startServer];
    [_outputStream startServer];
    [_client connectToServer:[self.device objectForKey:RWCDeviceAddressKey]
                      portNo:[[self.device objectForKey:RWCDevicePortNoKey] unsignedShortValue]];
}

- (void)disconnect
{
    [_client stopConnection];
    [_inputStream stopServer];
    [_outputStream stopServer];

    [_device release];
    _device = nil;
    
    [self resetAllParameters];
}

- (int)connectTimeout
{
    return _client.connectTimeout;
}

- (void)setConnectTimeout:(int)seconds
{
    _client.connectTimeout = seconds;
}

- (int)keepAliveTimeout
{
    return _client.keepAliveTimeout;
}

- (void)setKeepAliveTimeout:(int)seconds
{
    _client.keepAliveTimeout = seconds;

    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER *)buf;
    header->type    = RNP_TYPE_KEEP_ALIVE;
    header->subtype = RNP_SUBTYPE_SET_TIMEOUT;
    header->size[0] = 0;
    header->size[1] = 1;

    RNP_KEEP_ALIVE_TIMEOUT *timeout = (RNP_KEEP_ALIVE_TIMEOUT *)(buf + sizeof(RNP_HEADER));
    timeout->seconds = (unsigned char)seconds;

    [self writeToServer:buf];
}

- (void)streamHasBytesAvailable:(NSInputStream *)istream
{
    RNP_HEADER header;

    NSInteger readByteSize = [_client read:(u_int8_t *)&header maxLength:sizeof(RNP_HEADER)];
    if (readByteSize != sizeof(RNP_HEADER)) {
        return;
    }

    NSInteger dataByteSize = (header.size[0] << 8) | header.size[1];
    if (dataByteSize > NETREAD_BUF_SIZE) {
        return;
    }
    
    readByteSize = [_client read:_readBuffer maxLength:dataByteSize];
    if (readByteSize != dataByteSize) {
        return;
    }

    switch (header.type) {
        case RNP_TYPE_KEEP_ALIVE:
            if (header.subtype == RNP_SUBTYPE_SET_TIMEOUT) {
                RNP_KEEP_ALIVE_TIMEOUT *timeout = (RNP_KEEP_ALIVE_TIMEOUT *)_readBuffer;
                _client.keepAliveTimeout = timeout->seconds;
            }
            break;

        case RNP_TYPE_SYNC_TIMESTAMP:
            if ((RNP_SUBTYPE_SYNC_CONNECT <= header.subtype) && (header.subtype <= RNP_SUBTYPE_SYNC_INPUT_STOP)) {
                RNP_TIMESTAMP *timeStamp = (RNP_TIMESTAMP *)_readBuffer;
                _timeStamp[header.subtype] = (timeStamp->msec[0] << 24) |
                                             (timeStamp->msec[1] << 16) |
                                             (timeStamp->msec[2] <<  8) |
                                             (timeStamp->msec[3]);
            }
            break;

        case RNP_TYPE_MIDI_PACKET: {
            RNP_MIDI_PACKET *packet = (RNP_MIDI_PACKET *)_readBuffer;
            [_midiService parse:packet size:(int)readByteSize];
            break;
        }

        case RNP_TYPE_AUDIO_STATUS:
            assert(readByteSize == sizeof(RNP_AUDIO_STATUS));
            memcpy(&_audioStatus, _readBuffer, sizeof(RNP_AUDIO_STATUS));
            [self updateMetsers];
            break;

        default:
            break;
    }
}

- (void)streamOpenFailed
{
    if ([self.delegate respondsToSelector:@selector(connectionFailed:)]) {
        [self.delegate connectionFailed:self.device];
    }
}

- (void)streamOpenCompleted
{
    if ([self.delegate respondsToSelector:@selector(connectionDidEstablished:)]) {
        [self.delegate connectionDidEstablished:self.device];
    }
}

- (void)streamErrorOccurred
{
    if ([self.delegate respondsToSelector:@selector(connectionErrorDidOccur:)]) {
        [self.delegate connectionErrorDidOccur:self.device];
    }
}

- (void)streamEndEncountered
{
    if ([self.delegate respondsToSelector:@selector(connectionDidClosed:)]) {
        [self.delegate connectionDidClosed:self.device];
    }
}

- (NSInteger)writeToServer:(u_int8_t *)buf
{
    RNP_HEADER *header = (RNP_HEADER *)buf;
    NSUInteger length = ((header->size[0] << 8) | header->size[1]) + sizeof(RNP_HEADER);
    return [_client write:buf maxLength:length];
}

- (void)resetAllParameters
{
    memset(_timeStamp, 0, sizeof(_timeStamp));
    memset(&_audioStatus, 0, sizeof(_audioStatus));

    _audioStatus.output.peakPowerL =
    _audioStatus.output.peakPowerR =
    _audioStatus.input.peakPowerL =
    _audioStatus.input.peakPowerR = -120;

    _peakPower[0] = _peakPower[1] = _peakPower[2] = _peakPower[3] = -120.0;
}

- (void)updateMetsers
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

- (float)outputLevel:(int)channelNumber
{
    float peak;
    if (channelNumber == 0) {
        peak = _peakPower[0]; _peakPower[0] = _audioStatus.output.peakPowerL;
    } else {
        peak = _peakPower[1]; _peakPower[1] = _audioStatus.output.peakPowerR;
    }
    return peak;
}

- (float)inputLevel:(int)channelNumber
{
    float peak;
    if (channelNumber == 0) {
        peak = _peakPower[2]; _peakPower[2] = _audioStatus.input.peakPowerL;
    } else {
        peak = _peakPower[3]; _peakPower[3] = _audioStatus.input.peakPowerR;
    }
    return peak;
}

- (u_int32_t)connectStartTimeStamp { return _timeStamp[RNP_SUBTYPE_SYNC_CONNECT]; }
- (u_int32_t)outputStartTimeStamp { return _timeStamp[RNP_SUBTYPE_SYNC_OUTPUT_START]; }
- (u_int32_t)outputStopTimeStamp { return _timeStamp[RNP_SUBTYPE_SYNC_OUTPUT_STOP]; }
- (u_int32_t)inputStartTimeStamp { return _timeStamp[RNP_SUBTYPE_SYNC_INPUT_START]; }
- (u_int32_t)inputStopTimeStamp { return _timeStamp[RNP_SUBTYPE_SYNC_INPUT_STOP]; }

- (RNP_AUDIO_STATUS *)audioStatus { return &_audioStatus; }

@end

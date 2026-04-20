//
//  RWCAudioOutputStream.m
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import "RWCConnection.h"

#define OUTPUT_BUF_SIZE (8192)

@interface RWCAudioOutputStream () {

    RWCConnection *_connection;
    RWCNetServer *_server;

    NSInteger _length;
    NSInteger _offset;
    u_int8_t  _buffer[OUTPUT_BUF_SIZE];
}
@end

@implementation RWCAudioOutputStream

@synthesize delegate = _delegate;

@dynamic status;
@dynamic numberOfChannels;
@dynamic currentTime;
@dynamic volume;
@dynamic speed;

- (id)initWithConnection:(RWCConnection *)connection
{
    if (self = [super init]) {
        _connection = connection;
        _server = [[RWCNetServer alloc] initWithPortNo:0];
        _server.delegate = self;
    }
    return self;
}

- (void)dealloc
{
    _connection = nil;
    _server.delegate = nil;
    [_server release];
    [super dealloc];
}

- (void)startServer
{
    [_server startServer];
}

- (void)stopServer
{
    [_server stopServer];
}

- (void)ASBD:(AudioStreamBasicDescription *)format
{
    UInt32 channel = kRWCNumOfChannels;
    
    format->mSampleRate        = kRWCSampleRate;
    format->mFormatID          = kAudioFormatLinearPCM;
    format->mFormatFlags       = kLinearPCMFormatFlagIsSignedInteger
    | kLinearPCMFormatFlagIsPacked;
    format->mChannelsPerFrame  = channel;
    format->mBytesPerPacket    = sizeof(int16_t) * channel;
    format->mBytesPerFrame     = sizeof(int16_t) * channel;
    format->mBitsPerChannel    = 8 * sizeof(int16_t);
    format->mFramesPerPacket   = 1;
    format->mReserved          = 0;
}

- (void)start:(NSString *)deviceUID
{
    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER*)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_OUTPUT_START;
    header->size[0] = 0;
    header->size[1] = 2;

    RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL*)(buf + sizeof(RNP_HEADER));
    data->value[0] = (unsigned char)(_server.portNo >> 8);
    data->value[1] = (unsigned char)(_server.portNo);

    [_connection writeToServer:buf];
}

- (void)pause
{
    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER*)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_OUTPUT_PAUSE;
    header->size[0] = 0;
    header->size[1] = 0;

    [_connection writeToServer:buf];
}

- (void)stop
{
    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER*)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_OUTPUT_STOP;
    header->size[0] = 0;
    header->size[1] = 0;

    [_connection writeToServer:buf];

    [_server stopConnection];
}

- (int)status
{
    if (_server.outputStream) {
        return _connection.audioStatus->output.status;
    }
    return kAudioOutputStatusStop;
}

- (NSUInteger)numberOfChannels
{
    return kRWCNumOfChannels;
}

- (NSTimeInterval)currentTime
{
    unsigned long currentDeviceFrame =
        (_connection.audioStatus->output.frame[0] << 24) |
        (_connection.audioStatus->output.frame[1] << 16) |
        (_connection.audioStatus->output.frame[2] <<  8) |
        (_connection.audioStatus->output.frame[3] <<  0);

    return currentDeviceFrame / kRWCSampleRate;
}

- (float)volume
{
    return ((float)_connection.audioStatus->output.volume / 127.0);
}

- (void)setVolume:(float)gain
{
    if (gain < 0 || gain > 1.0)
        return;

    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER*)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_OUTPUT_VOLUME;
    header->size[0] = 0;
    header->size[1] = 1;

    RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL*)(buf + sizeof(RNP_HEADER));
    data->value[0] = (unsigned char)(gain * 127);

    [_connection writeToServer:buf];
}

- (float)speed
{
	return 1.0f;
}

- (void)setSpeed:(float)rate
{
	/* not supported */
}

- (float)pitch
{
	return 0.0f;
}

- (void)setPitch:(float)cent
{
	/* not supported */
}

- (float)peakPowerForChannel:(NSUInteger)channelNumber
{
    if (channelNumber >= kRWCNumOfChannels)
        return 0;

    return [_connection outputLevel:(int)channelNumber];
}

- (void)streamEventOpenCompleted:(RWCNetServer *)session
{
    _offset = _length = 0;
}

- (void)streamHasSpaceAvailable:(RWCNetServer *)session stream:(NSOutputStream *)ostream
{
    if (_length == 0) {
        _offset = 0;
        _length = [self.delegate outputStream:_buffer maxLength:sizeof(_buffer)];
    }

    NSInteger bytes = [ostream write:_buffer + _offset maxLength:_length];
    if (bytes <= 0) {
        [_server stopConnection];
        _length = 0;
        return;
    }

    _length -= bytes;
    _offset += bytes;
}

- (void)streamHasBytesAvailable:(RWCNetServer *)session stream:(NSInputStream *)istream
{
    u_int8_t dummy;
    [istream read:&dummy maxLength:sizeof(dummy)];
}

- (void)streamErrorOccurred:(RWCNetServer *)session { }
- (void)streamEndEncountered:(RWCNetServer *)session { }

@end

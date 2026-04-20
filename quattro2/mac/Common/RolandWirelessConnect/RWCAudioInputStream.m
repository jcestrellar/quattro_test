//
//  RWCInputStream.m
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import "RWCConnection.h"

#define INPUT_BUF_SIZE (8192)

@interface RWCAudioInputStream () {

    RWCConnection *_connection;
    RWCNetServer  *_server;

    NSInteger _offset;
    u_int8_t  _buffer[INPUT_BUF_SIZE];
}
@end

@implementation RWCAudioInputStream

@synthesize delegate = _delegate;

@dynamic status;
@dynamic numberOfChannels;
@dynamic currentTime;
@dynamic volume;

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

    RNP_HEADER *header = (RNP_HEADER *)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_INPUT_START;
    header->size[0] = 0;
    header->size[1] = 2;

    RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL *)(buf + sizeof(RNP_HEADER));
    data->value[0] = (unsigned char)(_server.portNo >> 8);
    data->value[1] = (unsigned char)(_server.portNo);

    [_connection writeToServer:buf];
}

- (void)pause
{
    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER *)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_INPUT_PAUSE;
    header->size[0] = 0;
    header->size[1] = 0;

    [_connection writeToServer:buf];
}

- (void)stop:(BOOL)shouldStopImmediate;
{
    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER *)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_INPUT_STOP;
    header->size[0] = 0;
    header->size[1] = 0;

    [_connection writeToServer:buf];

    if (shouldStopImmediate) {
        [_server stopConnection];
    }
}

- (void)inputMode:(int)mode
{
    u_int8_t buf[16];
    
    RNP_HEADER *header = (RNP_HEADER *)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_INPUT_MODE;
    header->size[0] = 0;
    header->size[1] = 1;
    
    RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL *)(buf + sizeof(RNP_HEADER));
    data->value[0] = (unsigned char)mode;
    
    [_connection writeToServer:buf];
}

- (int)status
{
    if (_server.inputStream) {
        return _connection.audioStatus->input.status;
    }
    return kAudioInputStatusStop;
}

- (NSUInteger)numberOfChannels
{
    return kRWCNumOfChannels;
}

- (NSTimeInterval)currentTime
{
    unsigned long currentDeviceFrame =
        (_connection.audioStatus->input.frame[0] << 24) |
        (_connection.audioStatus->input.frame[1] << 16) |
        (_connection.audioStatus->input.frame[2] <<  8) |
        (_connection.audioStatus->input.frame[3] <<  0);

    return currentDeviceFrame / kRWCSampleRate;
}

- (float)volume
{
    return ((float)_connection.audioStatus->input.volume / 127.0);
}

- (void)setVolume:(float)gain
{
    if (gain < 0 || gain > 1.0)
        return;
    
    u_int8_t buf[16];

    RNP_HEADER *header = (RNP_HEADER *)buf;
    header->type    = RNP_TYPE_AUDIO_CONTROL;
    header->subtype = RNP_SUBTYPE_INPUT_VOLUME;
    header->size[0] = 0;
    header->size[1] = 1;

    RNP_AUDIO_CONTROL *data = (RNP_AUDIO_CONTROL *)(buf + sizeof(RNP_HEADER));
    data->value[0] = (unsigned char)(gain * 127);

    [_connection writeToServer:buf];
}

- (float)peakPowerForChannel:(NSUInteger)channelNumber
{
    if (channelNumber >= kRWCNumOfChannels)
        return 0;
    return [_connection inputLevel:(int)channelNumber];
}

- (void)streamEventOpenCompleted:(RWCNetServer *)session
{
    _offset = 0;
}

- (void)streamHasBytesAvailable:(RWCNetServer *)session stream:(NSInputStream *)istream
{
    NSInteger bytes = [istream read:_buffer + _offset maxLength:sizeof(_buffer) - _offset];
    if (bytes <= 0) {
        [_server stopConnection];
        if ([self.delegate respondsToSelector:@selector(inputStreamDidClosed)]) {
            [self.delegate inputStreamDidClosed];
        }
        return;
    }

    bytes += _offset;
    NSInteger frames = bytes / kRWCBytesPerFrame;
    if (frames) {
        [self.delegate inputStream:_buffer maxLength:(frames * kRWCBytesPerFrame)];
    }

    _offset = bytes & (kRWCBytesPerFrame - 1);
    if (_offset) {
        NSInteger n = bytes & ~(kRWCBytesPerFrame - 1);
        for (int i = 0; i < _offset; i++)
            _buffer[i] = _buffer[n + i];
    }
}

- (void)streamHasSpaceAvailable:(RWCNetServer *)session stream:(NSOutputStream *)ostream { }
- (void)streamErrorOccurred:(RWCNetServer *)session { }
- (void)streamEndEncountered:(RWCNetServer *)session { }

@end

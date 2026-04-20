//
//  SamplePlayer.m
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import "SamplePlayer.h"
#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#import <AVFoundation/AVFoundation.h>
#endif

#define MAX_READ_FRAMES 4096

#if TARGET_OS_IPHONE
  #define kAudioQueueFrames (2048)
#else
  #define kAudioQueueFrames (1024)
#endif
#define kAudioQueueBufferSize (kAudioQueueFrames * (sizeof(int16_t) * 2))

@interface SamplePlayer () {
    AudioUnit _audioUnit;
    AudioStreamBasicDescription _fileFormat;
    AudioStreamBasicDescription _clientFormat;
    AudioBufferList _audioBufferList;
    ExtAudioFileRef _extAudioFile;
    NSMutableData *_data;
    NSUInteger _offset;

    BOOL _trigger;
    BOOL _playing;
    BOOL _paused;
    BOOL _stopImmediate;
    BOOL _bos;

    UInt64 _currentFrame;
    UInt64 _fadeOutStartFrame;

    NSTimeInterval _locateTime;
    NSTimeInterval _beginTime;
    NSTimeInterval _endTime;

    int _repeat;
    int _count;

    float _gain;
    NSTimeInterval _fadeInTime;
    NSTimeInterval _fadeOutTime;

    float __gain;

    RMSAvaragePower *_meter;
}
@property (retain) NSString *deviceUID;
@property (retain) NSURL *fileURL;
@property (readonly) BOOL ready;
@end

@implementation SamplePlayer

@dynamic device;
@dynamic file;
@dynamic ready;

@dynamic begin;
@dynamic end;
@dynamic volume;
@dynamic repeat;
@dynamic fadeIn;
@dynamic fadeOut;

@synthesize speed = _rate;
@synthesize pitch = _cent;

- (id)init
{
    if (self = [super init]) {
        _meter = [[RMSAvaragePower alloc] initWithBufferCount:0];
        _data = [[NSMutableData alloc] initWithLength:0];
        _gain = _rate = 1.0f;
    }
    return self;
}

- (void)dealloc
{
    _delegate = nil;

    [self close];
    [_data release];
    [_meter release];
    self.deviceUID = nil;

    [super dealloc];
}

- (NSString *)device
{
    return self.deviceUID ? self.deviceUID : @"";
}

- (void)setDevice:(NSString *)deviceUID
{
#if TARGET_OS_IPHONE
    /* Not supported */
#elif TARGET_OS_MAC
    self.deviceUID = deviceUID;
#endif

    if (_extAudioFile) {
        if (([self audioOutputStart] != noErr) && self.deviceUID) {
            self.deviceUID = nil;
            [self audioOutputStart];
        }
    }
}

- (NSURL *)file
{
    return self.fileURL;
}

- (void)close
{
    [self audioOutputClose];

    ExtAudioFileDispose(_extAudioFile);
    _extAudioFile = NULL;
    self.fileURL = nil;

    _data.length = 0;

    if (_audioBufferList.mBuffers[0].mData) {
        free(_audioBufferList.mBuffers[0].mData);
        _audioBufferList.mBuffers[0].mData = NULL;
    }

    [self term];

    _currentTime = _totalTime = 0;
    _locateTime = _beginTime = _endTime = 0;
}

- (BOOL)open:(NSURL *)url
{
    [self close];

    OSStatus err;

    err = ExtAudioFileOpenURL((CFURLRef)url, &_extAudioFile);

    if (err == noErr) {
        UInt32 size = sizeof(AudioStreamBasicDescription);
        err = ExtAudioFileGetProperty(_extAudioFile,
                                      kExtAudioFileProperty_FileDataFormat,
                                      &size,
                                      &_fileFormat);
        if (err == noErr) {
            memset(&_clientFormat, 0, sizeof(AudioStreamBasicDescription));
            _clientFormat.mFormatID          = kAudioFormatLinearPCM;
            _clientFormat.mFormatFlags       = kLinearPCMFormatFlagIsSignedInteger
                                             | kLinearPCMFormatFlagIsPacked;
            _clientFormat.mSampleRate        = _fileFormat.mSampleRate;
            _clientFormat.mChannelsPerFrame  = _fileFormat.mChannelsPerFrame;
            _clientFormat.mBitsPerChannel    = 16; /* fixed */
            _clientFormat.mBytesPerFrame     = (_clientFormat.mBitsPerChannel / 8) * _clientFormat.mChannelsPerFrame;
            _clientFormat.mBytesPerPacket    = (_clientFormat.mBitsPerChannel / 8) * _clientFormat.mChannelsPerFrame;
            _clientFormat.mFramesPerPacket   = 1;
            _clientFormat.mReserved          = 0;
        }
    }

    if (err == noErr) {
        err = ExtAudioFileSetProperty(_extAudioFile,
                                      kExtAudioFileProperty_ClientDataFormat,
                                      sizeof(AudioStreamBasicDescription),
                                      &_clientFormat);
    }

    if (err == noErr) {
        SInt64 fileLengthFrames = 0;
        UInt32 size = sizeof(SInt64);
        err = ExtAudioFileGetProperty(_extAudioFile,
                                      kExtAudioFileProperty_FileLengthFrames,
                                      &size,
                                      &fileLengthFrames);
        if (err == noErr) {
            _totalTime = fileLengthFrames / _clientFormat.mSampleRate;
        }
    }

    if (err == noErr) {
        self.fileURL = url;

        UInt32 bufSize = MAX_READ_FRAMES * _clientFormat.mBytesPerFrame;
        _audioBufferList.mNumberBuffers = 1;
        _audioBufferList.mBuffers[0].mNumberChannels = _clientFormat.mChannelsPerFrame;
        _audioBufferList.mBuffers[0].mDataByteSize = bufSize;
        _audioBufferList.mBuffers[0].mData = malloc(bufSize);

        [self initWithFormat:&_clientFormat];

        err = [self audioOutputStart];
    }

    if (err != noErr) {
        ExtAudioFileDispose(_extAudioFile);
        _extAudioFile = NULL;
    }

    return (err == noErr);
}

- (void)play
{
    if (_playing && _paused) {
        _paused = NO;
        return;
    }

    _count = _repeat;
    _trigger = YES;
}

- (void)pause
{
    if (_playing && !_paused) {
        _paused = YES;
        _trigger = YES;
    }
}

- (void)stop:(BOOL)shouldStopImmediate
{
    if (!self.ready || (_playing && _paused)) {
        [self stopped:NO];
        return;
    }

    if (_playing) {
        if (_fadeOutStartFrame) {
            _stopImmediate = YES;
        } else {
            _fadeOutStartFrame = _currentFrame;
            _stopImmediate = shouldStopImmediate;
        }
    }
}

- (void)stopped:(BOOL)eos
{
    _playing = _paused = NO;
    _currentTime = _locateTime = _beginTime; // = 0.0f;

    if (eos && [self.delegate respondsToSelector:@selector(samplePlayerDidEndSong:)]) {
        [self.delegate samplePlayerDidEndSong: self.fileURL];
    }
}

- (void)locate:(NSTimeInterval)time
{
    if (time < _beginTime) {
        time = _beginTime;
    }
    if (time > (_totalTime - _endTime)) {
        time = (_totalTime - _endTime);
    }

    bool playing = (_playing && !_paused);
    if (playing) {
        [self pause];
        [NSThread sleepForTimeInterval:0.05f];
    }
    if ([self seekAtTime:time]) {
        [self reset];
    }
    if (playing) {
        [self play];
    }
}

- (NSTimeInterval)begin
{
    return _beginTime;
}
- (void)setBegin:(NSTimeInterval)time
{
    if (time > (_totalTime - _endTime)) {
        time = (_totalTime - _endTime);
    }

    bool playing = (_playing && !_paused);
    if (playing) {
        [self pause];
        [NSThread sleepForTimeInterval:0.05f];
    }
    if ([self seekAtTime:time]) {
        _beginTime = time;
        [self reset];
    }
    if (playing) {
        [self play];
    }
}

- (NSTimeInterval)end
{
    return _endTime;
}
- (void)setEnd:(NSTimeInterval)time
{
    if (time >= 0) {
        _endTime = time;
        if ((_totalTime - _endTime) < _beginTime) {
            _endTime = (_totalTime - _beginTime);
        }
        if ((_totalTime - _endTime) < _currentTime) {
            [self setBegin:_beginTime];
        }
    }
}

- (float)volume
{
    return _gain;
}
- (void)setVolume:(float)gain
{
    if (0 <= gain && gain <= 1.0f) {
        _gain = gain;
    }
}

- (int)repeat
{
    return _repeat;
}
- (void)setRepeat:(int)count
{
    if (count >= -1) {
        _repeat = _count = count;
    }
}

- (NSTimeInterval)fadeIn
{
    return _fadeInTime;
}
- (void)setFadeIn:(NSTimeInterval)time
{
    if (time >= 0) {
        _fadeInTime = time;
    }
}

- (NSTimeInterval)fadeOut
{
    return _fadeOutTime;
}
- (void)setFadeOut:(NSTimeInterval)time
{
    if (time >= 0) {
        _fadeOutTime = time;
    }
}

- (NSString *)control:(NSString *)params
{
    return @"";
}

- (int)state
{
    if (_playing) {
        return (_paused ? kSamplePlayerStatePause :
            (_fadeOutStartFrame ? kSamplePlayerStateStopping : kSamplePlayerStatePlay));
    }
    return kSamplePlayerStateStop;
}

- (BOOL)seekAtTime:(float)time
{
    SInt64 frame = time * _fileFormat.mSampleRate;
    if (ExtAudioFileSeek(_extAudioFile, frame) == 0) {
        _data.length = 0;
        _currentTime = _locateTime = time;
        return YES;
    }
    return NO;
}

- (NSInteger)read:(u_int8_t *)buffer maxLength:(NSInteger)length
{
    u_int8_t *p = buffer;

    while (length > 0) {
        if (_data.length > 0) {
            NSUInteger size = _data.length - _offset;
            if (size > length) { size = length; }
            memcpy(p, _data.bytes + _offset, size);
            p += size; length -= size; _offset += size;
            if (_offset == _data.length) {
                _data.length = 0;
            }
            continue;
        }

        UInt32 frames = MAX_READ_FRAMES;
        _audioBufferList.mBuffers[0].mDataByteSize = frames * _clientFormat.mBytesPerFrame;
        OSStatus err = ExtAudioFileRead(_extAudioFile, &frames, &_audioBufferList);
        if (err != noErr) {
            return -1;
        }
        if (frames == 0) {
            if (_count == 0) {
                break;
            }
            if (_count > 0) _count--;
            if (![self seekAtTime:_beginTime]) {
                return -1;
            }
            continue;
        }
        _offset = 0;
        _data.length = frames * _clientFormat.mBytesPerFrame;
        memcpy(_data.mutableBytes, _audioBufferList.mBuffers[0].mData, _data.length);
    }

    return (NSInteger)(p - buffer);
}

- (void)initWithFormat:(const AudioStreamBasicDescription *)format {}
- (void)setPlaybackParams:(float)_rate :(float)_cent {}
- (void)term {}
- (void)reset {}
- (BOOL)ready { return YES; }
- (NSInteger)render:(u_int8_t *)buffer maxLength:(NSInteger)length { return 0; }

- (NSInteger)process:(u_int8_t *)buffer maxLength:(NSInteger)length
{
    int bytes = 0;
    _bos = NO;

    if (_trigger) {
        _trigger = NO;
        if (_playing) {
            if (self.ready) {
                NSInteger len = (length / 2) & ~0x1;
                NSInteger n = [self render:buffer maxLength:len];
                if (n <= 0) { [self stopped:YES]; return 0; }
                if (_paused) { return n; }
                [self envelope:buffer maxLength:n :1.0f :0.0f];
                buffer += n; length -= n; bytes += n;
            } else if (_paused) {
                return 0;
            }
        } else if (_locateTime == 0) {
            _bos = YES;
        }
        _playing = YES;
        _paused = NO;
        _currentFrame = 0;
        _fadeOutStartFrame = 0;
        [self seekAtTime:_locateTime];
        [self reset];
    } else if (self.ready && _endTime && _playing && !_paused) {
        if (_currentTime >= (_totalTime - _endTime)) {
            NSInteger len = (length / 2) & ~0x1;
            NSInteger n = [self render:buffer maxLength:len];
            if (n <= 0) { [self stopped:YES]; return 0; }
            if (_count == 0) { [self stopped:YES]; return n; }
            [self envelope:buffer maxLength:n :1.0f :0.0f];
            buffer += n; length -= n; bytes += n;
            if (_count > 0) _count--;
            [self seekAtTime:_beginTime];
            [self reset];
        }
    }

    if (self.ready && _playing && !_paused) {
        NSInteger n = [self render:buffer maxLength:length];
        if (n <= 0) { [self stopped:YES]; return bytes; }
        if (bytes) {
            [self envelope:buffer maxLength:n :0.0f :1.0f];
        }
        bytes += n;
    }

    return bytes;
}

- (float)fader
{
    if (!_playing || _paused) { return 0.0f; }

    float v = _gain;
    float fadeInFrames = _fadeInTime * _clientFormat.mSampleRate;
    if (_fadeOutStartFrame) {
        float fadeOut = (_stopImmediate || (_fadeOutTime == 0)) ? 0.005f : _fadeOutTime;
        float fadeOutFrames = fadeOut * _clientFormat.mSampleRate;
        float endFrame = _fadeOutStartFrame + fadeOutFrames;
        v = _gain * ((endFrame - _currentFrame) / fadeOutFrames);
        if (fadeInFrames && (_fadeOutStartFrame < fadeInFrames)) {
            v *= _fadeOutStartFrame  / fadeInFrames;
        }
        if (_currentFrame >= endFrame) {
            [self stopped:NO];
        }
    } else if (fadeInFrames && (_currentFrame < fadeInFrames)) {
        v = _gain * (_currentFrame / fadeInFrames);
    } else if (_bos) {
        __gain = [AudioVolume convert:v];
    }
    return [AudioVolume convert:v];
}

- (float)envelope:(u_int8_t *)buffer maxLength:(NSInteger)length :(float)coef0 :(float)coef1
{
    if (length <= 0) { return coef1; }

    float diff = coef1 - coef0;
    if ((diff == 0) && (coef0 <= 0.0f)) {
        memset(buffer, 0, length);
        return 0.0f;
    }

    NSInteger frames = length / _clientFormat.mBytesPerFrame;
    NSInteger blocks = _clientFormat.mBytesPerFrame / _clientFormat.mChannelsPerFrame;
    float step = diff / frames;

    u_int8_t* p = (u_int8_t*)buffer;
#if 0
    switch (_clientFormat.mBitsPerChannel) {
        case 32:
            while (frames-- > 0) {
                for (int ch = 0; ch < _clientFormat.mChannelsPerFrame; ch++, p += blocks) {
                    int32_t *data = (int32_t*)p;
                    *data = (int32_t)((float)(*data) * coef0);
                }
                coef0 += step;
            }
            break;
        case 24:
            while (frames-- > 0) {
                for (int ch = 0; ch < _clientFormat.mChannelsPerFrame; ch++, p += blocks) {
                    int32_t data = (int32_t)((*p << 8) | (*(p + 1) << 16) | (*(p + 2) << 24));
                    data = (int32_t)((float)(data) * coef0);
                    *(p + 0) = (u_int8_t)(data >>  8);
                    *(p + 1) = (u_int8_t)(data >> 16);
                    *(p + 2) = (u_int8_t)(data >> 24);
                }
                coef0 += step;
            }
            break;
        case 16:
#endif
            while (frames-- > 0) {
                for (int ch = 0; ch < _clientFormat.mChannelsPerFrame; ch++, p += blocks) {
                    int16_t *data = (int16_t*)p;
                    float v = (*data) * coef0;
                    *data = (int16_t)v;
                    [_meter setValueForChannel:ch value:v];
                }
                coef0 += step;
            }
#if 0
            break;
        case 8:
            while (frames-- > 0) {
                for (int ch = 0; ch < _clientFormat.mChannelsPerFrame; ch++, p += blocks) {
                    int16_t data = (int16_t)*p; data -= 0x80;
                    data = (int16_t)((float)(data) * coef0);
                    *p = (u_int8_t)(data + 0x80);
                }
                coef0 += step;
            }
            break;
    }
#endif

    return coef1;
}

- (void)renderCallback:(void*)buffer maxFrames:(UInt32)inNumberFrames
{
    NSInteger length = inNumberFrames * _clientFormat.mBytesPerFrame;
    NSInteger n = [self process:buffer maxLength:length];
    UInt32 frames = (UInt32)(n / _clientFormat.mBytesPerFrame);
    _currentFrame += frames;
    if (self.ENABLE_AUDIOUNIT) {
        _currentTime += ((_rate * frames) / _clientFormat.mSampleRate);
    } else {
        _currentTime += (frames / _clientFormat.mSampleRate);
    }
    float gain = [self fader];
    __gain = [self envelope:buffer maxLength:n :__gain :gain];
    memset(buffer + n, 0, length - n);
    [_meter updateWithFrames:inNumberFrames];
}

static OSStatus RenderCallback(void*                       inRefCon,
                               AudioUnitRenderActionFlags* ioActionFlags,
                               const AudioTimeStamp*       inTimeStamp,
                               UInt32                      inBusNumber,
                               UInt32                      inNumberFrames,
                               AudioBufferList*            ioData)
{
    SamplePlayer *obj = (SamplePlayer*)inRefCon;
    [obj renderCallback:ioData->mBuffers[0].mData maxFrames:inNumberFrames];
    return noErr;
}

static void outputCallback(void                 *inUserData,
                           AudioQueueRef        inAQ,
                           AudioQueueBufferRef  inBuffer)
{
    SamplePlayer *obj = (SamplePlayer*)inUserData;
    [obj renderCallback:inBuffer->mAudioData maxFrames:kAudioQueueFrames];
    inBuffer->mAudioDataByteSize = kAudioQueueBufferSize;
    AudioQueueEnqueueBuffer(obj.audioQueue, inBuffer, 0, NULL);
}

- (OSStatus)audioOutputStart
{
    [self audioOutputClose];

    OSStatus err;

    if (_ENABLE_AUDIOUNIT) {

        AudioComponentDescription cd;
        cd.componentType = kAudioUnitType_Output;
#if TARGET_OS_IPHONE
        cd.componentSubType = kAudioUnitSubType_RemoteIO;
#else
        cd.componentSubType = kAudioUnitSubType_DefaultOutput;
#endif
        cd.componentManufacturer = kAudioUnitManufacturer_Apple;
        cd.componentFlags = 0;
        cd.componentFlagsMask = 0;
        AudioComponent component = AudioComponentFindNext(NULL, &cd);
        err = AudioComponentInstanceNew(component, &_audioUnit);

        if (err == noErr) {
            err = AudioUnitInitialize(_audioUnit);
        }

        if (err == noErr) {
            AURenderCallbackStruct callbackStruct;
            callbackStruct.inputProc = RenderCallback;
            callbackStruct.inputProcRefCon = self;
            err = AudioUnitSetProperty(_audioUnit,
                                       kAudioUnitProperty_SetRenderCallback,
                                       kAudioUnitScope_Input,
                                       0,
                                       &callbackStruct,
                                       sizeof(AURenderCallbackStruct));
        }

        if (err == noErr) {
            err = AudioUnitSetProperty(_audioUnit,
                                       kAudioUnitProperty_StreamFormat,
                                       kAudioUnitScope_Input,
                                       0,
                                       &_clientFormat,
                                       sizeof(AudioStreamBasicDescription));
        }

#if TARGET_OS_IPHONE
		/* Not supported */
#elif TARGET_OS_MAC
        if (err == noErr) {
            AudioDeviceID deviceId = [AudioDevice deviceIDForUID:self.deviceUID scope:kAudioDevicePropertyScopeOutput];
            if (deviceId != kAudioObjectUnknown) {
                err = AudioUnitSetProperty(_audioUnit,
                                           kAudioOutputUnitProperty_CurrentDevice,
                                           kAudioUnitScope_Global,
                                           0,
                                           &deviceId,
                                           sizeof(AudioDeviceID));
            }
        }
#endif

    } else {

        err = AudioQueueNewOutput(&_clientFormat,
                                  outputCallback,
                                  self, NULL, NULL, 0,
                                  &_audioQueue);

        if (!err && (self.deviceUID.length > 0)) {
#if TARGET_OS_IPHONE
            /* Not supported */
#elif TARGET_OS_MAC
            CFStringRef deviceUIDRef = (CFStringRef)self.deviceUID;
            err = AudioQueueSetProperty(_audioQueue,
                                        kAudioQueueProperty_CurrentDevice,
                                        &deviceUIDRef,
                                        sizeof(deviceUIDRef));
#endif
        }

        if (!err) {
            AudioQueueBufferRef buffers[3];
            UInt32 bufferByteSize = kAudioQueueBufferSize;
            for (int bufferIndex = 0; bufferIndex < 3; bufferIndex++) {
                AudioQueueAllocateBuffer(_audioQueue,
                                         bufferByteSize,
                                         &buffers[bufferIndex]);
                memset(buffers[bufferIndex]->mAudioData, 0, kAudioQueueBufferSize);
                buffers[bufferIndex]->mAudioDataByteSize = kAudioQueueBufferSize;
                AudioQueueEnqueueBuffer(_audioQueue, buffers[bufferIndex], 0, NULL);
            }
            UInt32 enable = true;
            AudioQueueSetProperty(_audioQueue,
                                  kAudioQueueProperty_EnableTimePitch,
                                  &enable,
                                  sizeof(UInt32));
            AudioQueueSetParameter(_audioQueue,
                                   kAudioQueueParam_Volume,
                                   (Float32)1.0f);
            [self setPlaybackParams:_rate :_cent];
        }
    }

    if (err == noErr) {
#if TARGET_OS_IPHONE
		[[AVAudioSession sharedInstance] setPreferredIOBufferDuration:0.02f error:nil];
		[[NSNotificationCenter defaultCenter] addObserver:self
												 selector:@selector(audioSessionInterruption:)
													 name:AVAudioSessionInterruptionNotification
												   object:nil];
		[[NSNotificationCenter defaultCenter] addObserver:self
												 selector:@selector(audioOutputReStart:) name:UIApplicationWillEnterForegroundNotification
												   object:nil];
#endif
        [_meter configureWithSampleRate:_clientFormat.mSampleRate];
        _trigger = NO;
        if (_audioUnit) {
            err = AudioOutputUnitStart(_audioUnit);
        }
        if (_audioQueue) {
            err = AudioQueueStart(_audioQueue, NULL);
        }
    }

    return err;
}

- (void)audioOutputClose
{
    if (_audioUnit) {
        AudioOutputUnitStop(_audioUnit);
        AudioUnitUninitialize(_audioUnit);
        AudioComponentInstanceDispose(_audioUnit);
        _audioUnit = 0;
    }
    if (_audioQueue) {
        AudioQueueStop(_audioQueue, YES);
        AudioQueueDispose(_audioQueue, YES);
        _audioQueue = NULL;
    }

#if TARGET_OS_IPHONE
    [[NSNotificationCenter defaultCenter] removeObserver:self];
#endif

    [_meter clear];

    [self stopped:NO];
}

#if TARGET_OS_IPHONE
- (void)audioSessionInterruption:(NSNotification *)notification
{
    AVAudioSessionInterruptionType type = (AVAudioSessionInterruptionType)[notification.userInfo[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue];
    switch (type) {
        case AVAudioSessionInterruptionTypeBegan:
            [self pause];
            break;
        case AVAudioSessionInterruptionTypeEnded:
			[self audioOutputReStart:nil];
			break;
        default:
            break;
    }
}

- (void)audioOutputReStart:(NSNotification *)notification
{
    if (_audioUnit) {
        AudioOutputUnitStart(_audioUnit);
    }
    if (_audioQueue) {
        AudioQueueStart(_audioQueue, NULL);
    }
}
#endif

- (NSArray *)peakPowerForChannels
{
    NSMutableArray *array = [NSMutableArray array];
    for (int channelNumber = 0; channelNumber < [_meter numberOfChannels]; channelNumber++) {
        float peakPower = -120.0;
        float x = [_meter avaragePowerForChannel:channelNumber] / 32768.0f;
        if (x != 0) {
            peakPower = (float)(20 * log10(x));
            if (peakPower < -120.0)
                peakPower = -120.0;
        }
        [array addObject:[NSNumber numberWithFloat:peakPower]];
    }
    return array;
}

@end

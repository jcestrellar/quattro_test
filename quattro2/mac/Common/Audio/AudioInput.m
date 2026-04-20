//
//  AudioInput.m
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import <AVFoundation/AVFoundation.h>
#endif

#import "AudioInput.h"
#import "AudioVolume.h"

#define kSampleRate         (44100.0)
#define kNumOfChannels      (2)
#define kBufferSize         (2048 * (sizeof(int16_t) * 2))

@interface AudioInput () {
    AudioStreamBasicDescription audioFormat;

    AudioQueueRef audioQueueObject;
    BOOL started;
    BOOL playing;

    UInt64 currentFrame;
    float gain;

#if TARGET_OS_IPHONE
    AVAudioSession *session;
    AVAudioSessionCategory category;
    AVAudioSessionCategoryOptions categoryOptions;
#endif
}
@end

@implementation AudioInput

@synthesize delegate;

- (id)init
{
    if (self = [super init]) {
        gain = 1.0;
    }
    return self;
}

- (void)dealloc
{
    [self stop:YES];

    [super dealloc];
}

- (void)ASBD:(AudioStreamBasicDescription *)format
{
    UInt32 channel = (UInt32)[self numberOfChannels];

    format->mSampleRate        = kSampleRate;
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

- (void)writeBuffer:(AudioQueueBufferRef)inBuffer
{
    float coef = [AudioVolume convert:gain];

    NSInteger cnt = inBuffer->mAudioDataByteSize / sizeof(int16_t);
    for (int16_t *p = inBuffer->mAudioData; cnt > 0; p++, cnt--) {
        *p = (short)((*p) * coef);
    }

    [delegate inputStream:inBuffer->mAudioData maxLength:inBuffer->mAudioDataByteSize];
    currentFrame += (inBuffer->mAudioDataByteSize / audioFormat.mBytesPerFrame);
}

static void inputCallback(void *                               inUserData,
                          AudioQueueRef                        inAQ,
                          AudioQueueBufferRef                  inBuffer,
                          const AudioTimeStamp *               inStartTime,
                          UInt32                               inNumberPacketDescriptions,
                          const AudioStreamPacketDescription   *inPacketDescs)
{
    AudioInput *obj = (AudioInput*)inUserData;

    [obj writeBuffer:inBuffer];

    AudioQueueEnqueueBuffer(inAQ, inBuffer, 0, NULL);
}

- (void)prepareAudioQueue:(NSString *)deviceUID
{
    [self ASBD:&audioFormat];

    OSStatus err = AudioQueueNewInput(&audioFormat,
                                      inputCallback,
                                      self, NULL, NULL, 0,
                                      &audioQueueObject);
#if TARGET_OS_IPHONE
    /* Not supported */
#elif TARGET_OS_MAC
    if (!err && (deviceUID.length > 0)) {
        CFStringRef deviceUIDRef = (CFStringRef)deviceUID;
        err = AudioQueueSetProperty(audioQueueObject,
                                    kAudioQueueProperty_CurrentDevice,
                                    &deviceUIDRef,
                                    sizeof(deviceUIDRef));
    }
#endif
    if (!err) {
        AudioQueueBufferRef buffers[3];
        UInt32 bufferByteSize = kBufferSize;
        for (int bufferIndex = 0; bufferIndex < 3; bufferIndex++) {
            AudioQueueAllocateBuffer(audioQueueObject,
                                     bufferByteSize,
                                     &buffers[bufferIndex]);
            AudioQueueEnqueueBuffer(audioQueueObject,
                                    buffers[bufferIndex],
                                    0, NULL);
        }
        AudioQueueSetParameter(audioQueueObject,
                               kAudioQueueParam_Volume,
                               (Float32)gain);
#if TARGET_OS_IPHONE
        if (!session) {
            session = [AVAudioSession sharedInstance];
            category = session.category;
            categoryOptions = session.categoryOptions;
            [session setCategory:AVAudioSessionCategoryPlayAndRecord
                     withOptions:AVAudioSessionCategoryOptionMixWithOthers
                           error:nil];
        }
#endif
        started = YES;
    }
}

- (void)start:(NSString *)deviceUID
{
    if (!started)
        [self prepareAudioQueue:deviceUID];
    if (started) {
        AudioQueueStart(audioQueueObject, NULL);
        playing = YES;
        /* kAudioQueueProperty_EnableLevelMetering must be set after AudioQueueStart(). */
        UInt32 enable = true;
        AudioQueueSetProperty(audioQueueObject,
                              kAudioQueueProperty_EnableLevelMetering,
                              &enable,
                              sizeof(UInt32));
    }
}

- (void)pause
{
    AudioQueuePause(audioQueueObject);
    playing = NO;
}

- (void)stop:(BOOL)shouldStopImmediate
{
    AudioQueueStop(audioQueueObject, YES);
    AudioQueueDispose(audioQueueObject, YES);
    audioQueueObject = NULL;

    started = NO;
    playing = NO;

    currentFrame = 0;

#if TARGET_OS_IPHONE
    if (session) {
        [session setCategory:category withOptions:categoryOptions error:nil];
        session = nil;
    }
#endif

    if (!shouldStopImmediate) {
        if ([delegate respondsToSelector:@selector(inputStreamDidClosed)]) {
            [delegate inputStreamDidClosed];
        }
    }
}

- (int)status
{
    if (playing)
        return kAudioInputStatusStart;
    else if (started)
        return kAudioInputStatusPause;
    return kAudioInputStatusStop;
}

- (NSTimeInterval)currentTime
{
    return currentFrame / audioFormat.mSampleRate;
}

- (float)volume
{
    return (float)gain;
}

- (void)setVolume:(float)volume
{
    gain = volume;

    Float32 inValue = (Float32)[AudioVolume convert:gain];
    AudioQueueSetParameter(audioQueueObject, kAudioQueueParam_Volume, inValue);
}

- (NSUInteger)numberOfChannels
{
    return kNumOfChannels;
}

- (float)peakPowerForChannel:(NSUInteger)channelNumber
{
	float peakPower = -120.0;
	
	if (channelNumber < kNumOfChannels) {
		if (audioQueueObject) {
			AudioQueueLevelMeterState levelMeter[kNumOfChannels];
			UInt32 size = sizeof(levelMeter);
			AudioQueueGetProperty(audioQueueObject,
								  kAudioQueueProperty_CurrentLevelMeter,
								  &levelMeter,
								  &size);
            float coef = [AudioVolume convert:gain];
			float x = levelMeter[channelNumber].mAveragePower * coef;
			if (x != 0) {
				x = (float)(20 * log10(x));
				if (x > peakPower)
					peakPower = x;
			}
			
		}
	}
	
	return peakPower;
}

@end

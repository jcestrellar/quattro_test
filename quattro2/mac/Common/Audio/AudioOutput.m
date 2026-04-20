//
//  AudioOutput.m
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import "AudioOutput.h"
#import "AudioVolume.h"

#define kSampleRate         (44100.0)
#define kNumOfChannels      (2)
#define kBufferSize         (2048 * (sizeof(int16_t) * 2 ))

@interface AudioOutput () {
    AudioStreamBasicDescription audioFormat;

    AudioQueueRef audioQueueObject;
    BOOL started;
    BOOL playing;

    UInt64 currentFrame;
    float gain;
    float rate;
	float cent;
}
@end

@implementation AudioOutput

@synthesize delegate;

- (id)init
{
	if (self = [super init]) {
        gain = 1.0;
        rate = 1.0;
		cent = 0.0;
        [self ASBD:&audioFormat];
	}
	return self;
}

- (void)dealloc
{
    [self stop];

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

- (void)readBuffer:(AudioQueueBufferRef)inBuffer
{
    UInt32 byteSize = (UInt32)[delegate outputStream:inBuffer->mAudioData maxLength:kBufferSize];
    inBuffer->mAudioDataByteSize = byteSize;
    AudioQueueEnqueueBuffer(audioQueueObject, inBuffer, 0, NULL);

    currentFrame += (byteSize / audioFormat.mBytesPerFrame);
}

static void outputCallback(void                 *inUserData,
                           AudioQueueRef        inAQ,
                           AudioQueueBufferRef  inBuffer)
{
    AudioOutput *obj = (AudioOutput*)inUserData;
    [obj readBuffer:inBuffer];
}

- (void)prepareAudioQueue:(NSString *)deviceUID
{
    [self ASBD:&audioFormat];

    OSStatus err = AudioQueueNewOutput(&audioFormat,
                                       outputCallback,
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
            [self readBuffer:buffers[bufferIndex]];
        }
        UInt32 enable = true;
        AudioQueueSetProperty(audioQueueObject,
                              kAudioQueueProperty_EnableLevelMetering,
                              &enable,
                              sizeof(UInt32));
        AudioQueueSetProperty(audioQueueObject,
                              kAudioQueueProperty_EnableTimePitch,
                              &enable,
                              sizeof(UInt32));
        AudioQueueSetParameter(audioQueueObject,
                               kAudioQueueParam_Volume,
                               (Float32)gain);
        AudioQueueSetParameter(audioQueueObject,
                               kAudioQueueParam_PlayRate,
                               (Float32)rate);
		AudioQueueSetParameter(audioQueueObject,
							   kAudioQueueParam_Pitch,
							   (Float32)cent);
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
    }
}

- (void)pause
{
    AudioQueuePause(audioQueueObject);

	playing = NO;
}

- (void)stop
{
    if (started) {
		AudioQueueStop(audioQueueObject, YES);
		AudioQueueDispose(audioQueueObject, YES);
		audioQueueObject = NULL;
	}

    started = NO;
	playing = NO;

    currentFrame = 0;
}

- (int)status
{
    if (playing)
        return kAudioOutputStatusStart;
    else if (started)
        return kAudioOutputStatusPause;
    return kAudioOutputStatusStop;
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

- (float)speed
{
	return (float)rate;
}

- (void)setSpeed:(float)speed
{
    rate = speed;

    Float32 inValue = rate;
    AudioQueueSetParameter(audioQueueObject, kAudioQueueParam_PlayRate, inValue);
}

- (float)pitch
{
	return (float)cent;
}

- (void)setPitch:(float)pitch
{
	cent = pitch;

	Float32 inValue = cent;
	AudioQueueSetParameter(audioQueueObject, kAudioQueueParam_Pitch, inValue);
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

//
//  AudioVolume.m
//  
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import "AudioVolume.h"

@implementation AudioVolume

+ (float)convert:(float)gain
{
    if (gain <= 0.0f) return 0.0f;
    if (gain >= 1.0f) return 1.0f;
    return pow(gain, 1.75f);
}

@end

#define kRMSNumOfChannels (2)

@interface RMSAvaragePower () {
    float _sampleRate;
    UInt32 _maxpos;
    UInt32 _curpos;
    UInt32 *_bufFrames;
    float *_bufValues;

    UInt32 _frames[kRMSNumOfChannels];
    float _values[kRMSNumOfChannels];
    float _lastValues[kRMSNumOfChannels];
    BOOL _reset;
}
@end

@implementation RMSAvaragePower

- (id)initWithBufferCount:(int)count
{
    if (self = [super init]) {
        _sampleRate = 44100.0f;
        _maxpos = (count > 0) ? count : 1;
        _bufFrames = (UInt32 *)calloc(_maxpos * kRMSNumOfChannels, sizeof(UInt32));
        _bufValues = (float *)calloc(_maxpos * kRMSNumOfChannels, sizeof(float));
        [self clear];
    }
    return self;
}

- (void)dealloc
{
    free(_bufFrames);
    free(_bufValues);

    [super dealloc];
}


- (int)numberOfChannels
{
    return kRMSNumOfChannels;
}

- (void)clear
{
    _curpos = 0;
    memset(_bufFrames, 0, (_maxpos * kRMSNumOfChannels) * sizeof(int));
    memset(_bufValues, 0, (_maxpos * kRMSNumOfChannels) * sizeof(float));
    for (int channelNumber = 0; channelNumber < kRMSNumOfChannels; channelNumber++) {
        _frames[channelNumber] = 0;
        _values[channelNumber] = 0;
        _lastValues[channelNumber] = 0;
    }
}

- (void)configureWithSampleRate:(float)sampleRate
{
    if (sampleRate > 0.0f) {
        [self clear];
        _sampleRate = sampleRate;
    }
}

- (void)setValueForChannel:(int)channelNumber value:(float)v;
{
    if (channelNumber < kRMSNumOfChannels) {
        _bufValues[(_maxpos * channelNumber) + _curpos] += (v * v);
    }
}

- (void)updateWithFrames:(UInt32)frames
{
    for (int channelNumber = 0; channelNumber < kRMSNumOfChannels; channelNumber++) {
        _bufFrames[(_maxpos * channelNumber) + _curpos] = frames;
    }

    if (++_curpos >= _maxpos) {
        _curpos = 0;
    }

    for (int channelNumber = 0; channelNumber < kRMSNumOfChannels; channelNumber++) {
        if (_reset) { _frames[channelNumber] = 0; _values[channelNumber] = 0; }
        _frames[channelNumber] += _bufFrames[(_maxpos * channelNumber) + _curpos];
        _values[channelNumber] += _bufValues[(_maxpos * channelNumber) + _curpos];
        _bufFrames[(_maxpos * channelNumber) + _curpos] = 0;
        _bufValues[(_maxpos * channelNumber) + _curpos] = 0.0f;
    }
    _reset = NO;
}

- (float)avaragePowerForChannel:(int)channelNumber
{
    float avaragePower = 0.0f;
    if (channelNumber < kRMSNumOfChannels) {
        if (_frames[channelNumber] > 0) {
            avaragePower = sqrt(_values[channelNumber] / _frames[channelNumber]);
            if (avaragePower < _lastValues[channelNumber]) {
                float coef = (1 - exp((_frames[channelNumber] / _sampleRate) * (-6)));
                _lastValues[channelNumber] += ((avaragePower - _lastValues[channelNumber]) * coef);
                if (_lastValues[channelNumber] < 0.0f) {
                    _lastValues[channelNumber] = 0.0f;
                }
                avaragePower = _lastValues[channelNumber];
            } else {
                _lastValues[channelNumber] = avaragePower;
            }
            _reset = YES;
        }
    }
    return avaragePower;
}

@end

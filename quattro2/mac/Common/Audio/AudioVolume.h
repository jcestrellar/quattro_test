//
//  AudioVolume.h
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface AudioVolume : NSObject

+ (float)convert:(float)gain;

@end

@interface RMSAvaragePower : NSObject

- (id)initWithBufferCount:(int)count;

- (int)numberOfChannels;
- (void)clear;
- (void)configureWithSampleRate:(float)sampleRate;
- (void)updateWithFrames:(UInt32)frames;
- (void)setValueForChannel:(int)channelNumber value:(float)v;
- (float)avaragePowerForChannel:(int)channelNumber;

@end

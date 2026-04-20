//
//  AudioInput.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "AudioInputStream.h"

/** 本体でのオーディオ入力用のオブジェクトです。
 
 AudioInputStream プロトコルを実装しています。
 
 @see AudioInputStream
 */
@interface AudioInput : NSObject <AudioInputStream>

@property (assign) id<AudioInputStreamDelegate> delegate;

- (void)ASBD:(AudioStreamBasicDescription *)audioFormat;

- (void)start:(NSString *)deviceUID;
- (void)pause;
- (void)stop:(BOOL)shouldStopImmediate;

- (float)volume;
- (void)setVolume:(float)gain;

- (NSUInteger)numberOfChannels;

- (float)peakPowerForChannel:(NSUInteger)channelNumber;
- (NSTimeInterval)currentTime;
- (int)status;

@end

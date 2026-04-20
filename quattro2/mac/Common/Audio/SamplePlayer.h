//
//  SamplePlayer.h
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <AudioUnit/AudioUnit.h>
#import <AudioToolbox/ExtendedAudioFile.h>
#import "AudioDevice.h"
#import "AudioVolume.h"

enum {
	kSamplePlayerStateStop,
	kSamplePlayerStateStopping,
	kSamplePlayerStatePlay,
	kSamplePlayerStatePause
};

@protocol SamplePlayerDelegate <NSObject>

@optional
- (void)samplePlayerDidEndSong:(NSURL *)fileURL;

@end

@interface SamplePlayer : NSObject

@property (assign) id<SamplePlayerDelegate> delegate;

@property (assign) BOOL ENABLE_AUDIOUNIT;
@property (assign) AudioQueueRef audioQueue;

@property (assign) NSString *device;

@property (readonly) NSURL *file;
@property (readonly) NSTimeInterval totalTime;
@property (readonly) NSTimeInterval currentTime;
@property (readonly) int state;

@property (assign) NSTimeInterval begin;
@property (assign) NSTimeInterval end;

@property (assign) float volume;
@property (assign) int repeat;

@property (assign) NSTimeInterval fadeIn;
@property (assign) NSTimeInterval fadeOut;

@property (assign) float speed;
@property (assign) float pitch;

- (BOOL)open:(NSURL *)fileURL;
- (void)close;

- (void)play;
- (void)pause;
- (void)stop:(BOOL)shouldStopImmediate;

- (void)locate:(NSTimeInterval)time;
- (NSArray *)peakPowerForChannels;

- (NSString *)control:(NSString *)params;

- (NSInteger)read:(u_int8_t *)buffer maxLength:(NSInteger)length;

@end

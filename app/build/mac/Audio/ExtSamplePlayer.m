//
//  ExtSamplePlayer.m
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import "ExtSamplePlayer.h"

@interface ExtSamplePlayer () {
}
@end

@implementation ExtSamplePlayer

- (id)init
{
    if (self = [super init]) {
        //self.ENABLE_AUDIOUNIT = YES;
    }
    return self;
}

- (void)dealloc
{
    [super dealloc];
}

- (void)setPlaybackParams:(float)rate :(float)cent
{
    if (self.audioQueue) {
        AudioQueueSetParameter(self.audioQueue, kAudioQueueParam_PlayRate, (Float32)rate);
        AudioQueueSetParameter(self.audioQueue, kAudioQueueParam_Pitch, (Float32)cent);
    }
}

- (void)setSpeed:(float)rate
{
    if (0.5f <= rate && rate <= 2.0f) {
        super.speed = rate;
        if (self.audioQueue) {
            AudioQueueSetParameter(self.audioQueue, kAudioQueueParam_PlayRate, (Float32)rate);
        }
    }
}

- (void)setPitch:(float)cent
{
    if (-2400 <= cent && cent <= 2400) {
        super.pitch = cent;
        if (self.audioQueue) {
            AudioQueueSetParameter(self.audioQueue, kAudioQueueParam_Pitch, (Float32)cent);
        }
    }
}

- (void)initWithFormat:(const AudioStreamBasicDescription *)format
{
}

- (void)term
{
}

- (void)reset
{
}

- (NSInteger)render:(u_int8_t *)buffer maxLength:(NSInteger)length
{
    return [self read:buffer maxLength:length];
}

@end

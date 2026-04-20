//
//  ExtSamplePlayer.h
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import "mac/Common/Audio/SamplePlayer.h"

@interface ExtSamplePlayer : SamplePlayer

- (void)setSpeed:(float)rate;
- (void)setPitch:(float)cent;

- (void)initWithFormat:(const AudioStreamBasicDescription *)format;
- (void)term;
- (void)reset;
- (NSInteger)render:(u_int8_t *)buffer maxLength:(NSInteger)length;

@end

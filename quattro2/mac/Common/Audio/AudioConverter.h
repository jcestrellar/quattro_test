//
//  AudioConverter.h
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioToolbox.h>
#import <AudioToolbox/ExtendedAudioFile.h>

@interface AudioConverter : NSObject

+ (BOOL)formatWithURL:(NSURL *)fileURL format:(AudioStreamBasicDescription *)format duration:(Float64 *)duration;

+ (BOOL)convertAtURL:(NSURL *)inURL toURL:(NSURL *)outURL format:(const AudioStreamBasicDescription *)format;
+ (BOOL)splitAtURL:(NSURL *)inURL toURL:(NSArray *)wavURLs;
+ (BOOL)reverseAtURL:(NSURL *)inURL toURL:(NSURL *)wavURL;

@end

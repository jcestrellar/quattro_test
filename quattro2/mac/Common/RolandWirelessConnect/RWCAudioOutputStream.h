//
//  RWCAudioOutputStream.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RWCNetServer.h"
#import "../Audio/AudioOutputStream.h"

@class RWCConnection;

/** 楽器へのオーディオ出力用のオブジェクトです。
 
 AudioOutputStream プロトコルを実装しています。
 
 @see AudioOutputStream
*/
@interface RWCAudioOutputStream : NSObject <AudioOutputStream, RWCNetServerDelegate>

- (id)initWithConnection:(RWCConnection *)conn;

- (void)ASBD:(AudioStreamBasicDescription *)format;

@property (assign) id<AudioOutputStreamDelegate> delegate;

@property (assign) float volume;
@property (assign) float speed;
@property (readonly) int status;
@property (readonly) NSTimeInterval currentTime;
@property (readonly) NSUInteger numberOfChannels;

- (float)peakPowerForChannel:(NSUInteger)channelNumber;

- (void)start:(NSString *)deviceUID;
- (void)pause;
- (void)stop;

-(void)startServer;
-(void)stopServer;

@end

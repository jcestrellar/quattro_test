//
//  RWCInputStream.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RWCNetServer.h"
#import "../Audio/AudioInputStream.h"

@class RWCConnection;

/** 楽器からのオーディオ入力用のオブジェクトです。

 AudioInputStream プロトコルに加え、楽器のオーディオ入力モードを切り替える
 
 `- (void)inputMode:(int)mode;`

 を実装しています。

 @see AudioInputStream
 */
@interface RWCAudioInputStream : NSObject <AudioInputStream, RWCNetServerDelegate>

- (id)initWithConnection:(RWCConnection *)connection;

- (void)ASBD:(AudioStreamBasicDescription *)format;

@property (assign) id<AudioInputStreamDelegate> delegate;

///-----------------------------------------------------------------------------
/// @name オーディオ入力の設定
///-----------------------------------------------------------------------------

/** オーディオ入力モードの設定
 
 オーディオ入力モードを設定します。初期設定は、RNP_INPUT_MODE_MIX です。
 
 - RNP_INPUT_MODE_MIX : 楽器へ送ったオーディオ出力とミックスして、オーディオ入力を返します。
 - RNP_INPUT_MODE_SOLO : 楽器へ送ったオーディオ出力はミックスされず、オーディオ入力が返されます。
 
 @param mode RNP_INPUT_MODE_MIX, RNP_INPUT_MODE_SOLO
 
 @note この設定は、楽器がオーディオ入力モードの切り替えをサポートしている（RWCConnecton device プロパティの
 RWCDeviceCapsKey キー値に RNP_CAPS_AUDIO_INPUT_MODE がセットされている）必要があります。
 */
- (void)inputMode:(int)mode;

@property (assign) float volume;
@property (readonly) int status;
@property (readonly) NSTimeInterval currentTime;
@property (readonly) NSUInteger numberOfChannels;

- (float)peakPowerForChannel:(NSUInteger)channelNumber;

- (void)start:(NSString *)deviceUID;
- (void)pause;
- (void)stop:(BOOL)shouldStopImmediate;

-(void)startServer;
-(void)stopServer;

@end

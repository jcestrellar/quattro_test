//
//  MIDIOutputPort.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreMIDI/CoreMIDI.h>

@class MIDIClient;

@interface MIDIOutputEndpoint : NSObject
@property (assign) MIDIEndpointRef endpointRef;
@end

/**
 MIDI 出力ポートを管理するオブジェクト
 */
@interface MIDIOutputPort : NSObject

#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
@property (assign) u_int8_t running;
#endif
#endif

/**
 エンドポイントリスト（Destination）
 */
@property (readonly) NSArray *endpoints;

- (id)initWithClient:(MIDIClient *)client;

/**
 エンドポイント（Destination）に接続
 @param endpoint 接続するエンドポイント（辞書形式）
 */
- (void)connectEndpoint:(NSDictionary *)endpoint;

/**
 全てのエンドポイント（Destination）に接続
 */
- (void)connectAllEndpoints;

/**
 エンドポイント（Destination）と切断
 @param endpoint 切断するエンドポイント（辞書形式）
 */
- (void)disconnectEndpoint:(NSDictionary *)endpoint;

/**
 すべてのエンドポイント（Destintion）と切断
 */
- (void)disconnectAllEndpoints;

/**
 MIDI メッセージを送信
 @param msg 送信するMIDIメッセージを格納したバッファの先頭ポインタ
 @param bytes MIDIメッセージのバイト数
 */
- (void)send:(const u_int8_t *)msg size:(int)bytes;

- (void)disconnect:(MIDIEndpointRef)endpointRef;

@end

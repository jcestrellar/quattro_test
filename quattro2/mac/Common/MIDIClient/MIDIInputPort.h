//
//  MIDIInputPort.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreMIDI/CoreMIDI.h>

@class MIDIClient;

/**
 MIDI メッセージを受信するプロトコル
 */
@protocol MIDIInputDelegate <NSObject>

/**
 MIDI メッセージの受信

 MIDIメッセージを受信すると呼ばれます。
 @param msg MIDI メッセージを格納したバッファの先頭ポインタ
 @param bytes MIDI メッセージのバイト数
 @param msec CoreMIDI タイムスタンプ（ミリ秒）
 */
- (void)midiInputMessage:(const u_int8_t *)msg size:(int)bytes timeStamp:(u_int32_t)msec;

@end

/**
 MIDI 入力ポートを管理するオブジェクト
 */
@interface MIDIInputPort : NSObject

/**
 MIDI メッセージを受信するデリゲート
 @see MIDIInputDelegate
 */
@property (assign) id<MIDIInputDelegate> delegate;

/**
 エンドポイントリスト（Source）
 */
@property (readonly) NSArray *endpoints;

- (id)initWithClient:(MIDIClient*)client UID:(int)uid;

/**
 エンドポイント（Source）に接続
 @param endpoint 接続するエンドポイント（辞書形式）
 */
- (void)connectEndpoint:(NSDictionary *)endpoint;

/**
 全てのエンドポイント（Source）に接続
 */
- (void)connectAllEndpoints;

/**
 エンドポイント（Source）と切断
 @param endpoint 切断するエンドポイント（辞書形式）
 */
- (void)disconnectEndpoint:(NSDictionary *)endpoint;

/**
 すべてのエンドポイント（Source）と切断
 */
- (void)disconnectAllEndpoints;

- (void)disconnect:(MIDIEndpointRef)endpointRef;

#ifdef VMIDI_IN
@property (assign) id vparser;
#endif

@end

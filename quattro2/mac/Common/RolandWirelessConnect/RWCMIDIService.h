//
//  RWCMIDIService.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RWCProtocol.h"

/** MIDI メッセージを受信するプロトコルです。 */
@protocol RWCMIDIInputDelegate <NSObject>

@optional

/** MIDI メッセージの受信

 楽器から MIDI メッセージを受信すると呼ばれます。

 @param msg MIDI メッセージを格納したバッファの先頭ポインタ
 @param bytes MIDI メッセージのバイト数
 @param msec MIDI メッセージを送信した時点での、楽器側のタイムスタンプ（ミリ秒）
 @param cin MIDI ケーブル番号（0 〜 15）
 */
- (void)midiInputMessage:(u_int8_t *)msg size:(int)bytes timeStamp:(u_int32_t)msec cable:(int)cin;

@end

@class RWCConnection;

/** 楽器との MIDI 入出力を管理するオブジェクトです。 */
@interface RWCMIDIService : NSObject

- (id)initWithConnection:(RWCConnection *)connection;

- (void)parse:(RNP_MIDI_PACKET*)packet size:(int)length;

///-----------------------------------------------------------------------------
/// @name MIDI 入力
///-----------------------------------------------------------------------------

/** MIDI メッセージを受信するデリゲート
 @see RWCMIDIInputDelegate
 */
@property (assign) id<RWCMIDIInputDelegate> delegate;

///-----------------------------------------------------------------------------
/// @name MIDI 出力
///-----------------------------------------------------------------------------

/** MIDI メッセージの送信

 楽器へ MIDI メッセージを送信します。

 @param msg MIDI メッセージを格納したバッファの先頭ポインタ
 @param bytes MIDI メッセージのバイト数
 @param cin MIDI ケーブル番号（0 〜 15）
 */
- (void)send:(const u_int8_t *)msg size:(int)bytes cable:(int)cin;

/** MIDI メッセージの送信

 楽器へ MIDI メッセージを送信します。

 @param msg MIDI メッセージを格納したバッファの先頭ポインタ
 @param bytes MIDI メッセージのバイト数
 */
- (void)send:(const u_int8_t *)msg size:(int)bytes;

///-----------------------------------------------------------------------------
/// @name MIDI ストリーミングの設定
///-----------------------------------------------------------------------------

/** MIDI ストリーミング機能

 楽器の MIDI ストリーミング機能のオン／オフを切り替えます。

 @note MIDI ストリーミング機能をオンにすると、MIDI メッセージはタイムスタンプ付きで楽器へ送信されます。
 楽器側は送られた MIDI メッセージを一旦バッファリングし、一定時間遅延した後、タイムスタンプから
 MIDI シーケンスを再現します。
 オフの場合は、楽器へ送られた MIDI メッセージは、即座に処理されます。

 @note MIDI ストリーミング機能を有効にするには、楽器が MIDI ストリーミング機能をサポートしている
 （RWCConnecton device プロパティの RWCDeviceCapsKey 値に RNP_CAPS_MIDI_STREAMING が
 セットされている）必要があります。
 */
@property (assign) BOOL streaming;

/** MIDI ストリーミング遅延時間の設定

 MIDI ストリーミングの遅延時間（秒）を設定します。
 遅延時間の初期値は 1 秒です。
 */
@property (assign) NSTimeInterval streamingDelayTime;

@end

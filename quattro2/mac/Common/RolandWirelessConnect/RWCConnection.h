//
//  RWCConnection.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RWCProtocol.h"
#import "RWCMIDIService.h"
#import "RWCAudioInputStream.h"
#import "RWCAudioOutputStream.h"
#import "RWCNetClient.h"

/** 楽器との接続で発生したイベント通知を受け取るプロトコル */
@protocol RWCConnectionDelegate <NSObject>

@optional

///-----------------------------------------------------------------------------
/// @name 接続イベント
///-----------------------------------------------------------------------------

/** 楽器との接続に失敗した

 @param device 接続に失敗した楽器情報（辞書形式）
 */
- (void)connectionFailed:(NSDictionary *)device;

/** 楽器との接続が確立した

 @param device 接続した楽器情報（辞書形式）
 */
- (void)connectionDidEstablished:(NSDictionary *)device;

/** 楽器との接続が切断された

 楽器が接続を切断した場合、もしくは接続確認応答に対して反応が無かった場合に通知されます。

 @param device 接続を切断した楽器情報（辞書形式）
 */
- (void)connectionDidClosed:(NSDictionary *)device;

/** 楽器との通信でエラーが発生した

 @param device 通信エラーが発生した楽器情報（辞書形式）
 */
- (void)connectionErrorDidOccur:(NSDictionary *)device;

@end

/** 楽器との接続を管理するオブジェクトです。
 
 接続する楽器情報（辞書形式）でオブジェクトを初期化した後、楽器との接続を開始します。
 接続する楽器情報（辞書形式）は、RWCDiscovery で取得できます。
 
 接続後は、以下のそれぞれのオブジェクトを通して、楽器との入出力を行います。
 
 - midiService（楽器との MIDI 入出力オブジェクト）
 - outputStream（楽器へのオーディオ出力オブジェクト）
 - inputStream（楽器からのオーディオ入力オブジェクト）
 */
@interface RWCConnection : NSObject <RWCNetClientDelegate>

///-----------------------------------------------------------------------------
/// @name 楽器との接続および設定
///-----------------------------------------------------------------------------

/** 接続 で発生したイベント通知を受け取るデリゲート
 @see RWCConnectionDelegate
 */
@property (assign) id<RWCConnectionDelegate> delegate;

/** 接続の開始

 楽器との接続処理を開始します。関数からはすぐに戻ります（非同期）。
 
 接続が確立すると、デリゲートの connectionDidEstablished が呼ばれます。
 接続に失敗した場合は、デリゲートの connectionFailed が呼ばれます。

 @param device 接続する楽器情報（辞書形式）
 @see RWCDiscovery
*/
- (void)connect:(NSDictionary *)device;

/** 接続の停止

 楽器との接続を停止します。
 */
- (void)disconnect;

/** 接続処理のタイムアウト

 接続処理のタイムアウト時間（秒）を設定します。

 タイムアウト時間が過ぎても楽器と接続できなかった場合は、デリゲートの connectionFailed が呼ばれます。

 タイムアウトの初期値は 5 秒です。
 */
@property (assign) int connectTimeout;

/** 接続確認応答のタイムアウト時間
 
 接続確認応答のタイムアウト時間（秒）を設定します。
 
 楽器と接続中、楽器から接続確認応答がタイムアウト時間内に来なければ、自動的に接続を切断します。
 切断するとデリゲートの connectionDidClosed が通知されます。
 
 タイムアウトの初期値は3秒です。
 
 @warning *Important:* 楽器側でも接続確認をしています。デバッグ中、ブレイクポイントなどで処理を停止すると、
 楽器側では、端末からの接続確認が無応答だと見なし、接続を切断してしまいます。
 デバッグ中はタイムアウトを 0 （接続確認を行わない）にすると、この状態を回避できます。
 */
@property (assign) int keepAliveTimeout;

///-----------------------------------------------------------------------------
/// @name MIDI、オーディオ入出力のオブジェクト
///-----------------------------------------------------------------------------

/** MIDI通信用オブジェクト

 楽器とのMIDI通信用のオブジェクトです。

 @see RWCMIDIService
 */
@property (retain) RWCMIDIService *midiService;


/** オーディオ出力用オブジェクト

 楽器へのオーディオ出力用のオブジェクトです。

 @see RWCAudioOutputStream
 */
@property (retain) RWCAudioOutputStream *outputStream;

/** オーディオ入力用オブジェクト

 楽器からのオーディオ入力用のオブジェクトです。

 @see RWCAudioInputStream
 */
@property (retain) RWCAudioInputStream  *inputStream;

///-----------------------------------------------------------------------------
/// @name 楽器の情報
///-----------------------------------------------------------------------------

/** 接続対象の楽器情報（形式） */
@property (readonly) NSDictionary *device;

///-----------------------------------------------------------------------------
/// @name 同期用のタイムスタンプ
///-----------------------------------------------------------------------------

/** 接続確立時のタイムスタンプ

 接続が確立した時点での、楽器側のタイムスタンプ（ミリ秒）を返します。
 */
@property (readonly) u_int32_t connectStartTimeStamp;

/** オーディオ出力開始時のタイムスタンプ
 
 楽器の送信したオーディオデータの先頭が、楽器から出力される時点での、
 楽器側のタイムスタンプ（ミリ秒）を返します。
 
 @note 楽器はオーディオデータをバッファリングしながら再生するため、オーディオ出力開始
 （RWCAudioOutputStream start）から若干遅れて、楽器から音が再生されます。
 */
@property (readonly) u_int32_t outputStartTimeStamp;

/**
 * オーディオ出力停止時のタイムスタンプ
 */
@property (readonly) u_int32_t outputStopTimeStamp;

/**
 * オーディオ入力開始時のタイムスタンプ
 */
@property (readonly) u_int32_t inputStartTimeStamp;

/**
 * オーディオ入力停止時のタイムスタンプ
 */
@property (readonly) u_int32_t inputStopTimeStamp;

@property (readonly) RNP_AUDIO_STATUS *audioStatus;

- (NSInteger)writeToServer:(u_int8_t *)buf;

- (float)outputLevel:(int)channelNumber;

- (float)inputLevel:(int)channelNumber;

@end

//
//  AudioOutputStream.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioToolbox.h>

enum {
    kAudioOutputStatusStop,
    kAudioOutputStatusStart,
    kAudioOutputStatusPause
};

/** オーディオ出力ストリームのイベント通知を受け取るプロトコルです。 */
@protocol AudioOutputStreamDelegate <NSObject>

///-----------------------------------------------------------------------------
/// @name オーディオ出力ストリームのイベント
///-----------------------------------------------------------------------------

@required

/** オーディオ出力データの要求

 オーディオ出力ストリームのバッファが空になると呼ばれます。
 出力するオーディデータを buffer に入れてください。

 @param buffer オーディオデータを格納するバッファの先頭ポインタ
 @param length バッファの最大バイトサイズ
 @return bufferに書き込んだデータバイト数
 */
- (NSInteger)outputStream:(u_int8_t *)buffer maxLength:(NSInteger)length;

@end

/** オーディオ出力ストリームを管理するプロトコルです。 */
@protocol AudioOutputStream <NSObject>

@required
- (void)ASBD:(AudioStreamBasicDescription *)audioFormat;

///-----------------------------------------------------------------------------
/// @name オーディオ出力ストリームの設定
///-----------------------------------------------------------------------------

/** オーディオ出力ストリームのイベント通知を受け取るデリゲート
 @param delegate AudioOutputStreamDelegate プロトコルを実装したデリゲート
 */
- (void)setDelegate:(id<AudioOutputStreamDelegate>)delegate;

///-----------------------------------------------------------------------------
/// @name オーディオ出力ストリームの操作
///-----------------------------------------------------------------------------

/** オーディオ出力の開始／再開

 オーディオ出力を、開始もしくは再開します。

 @param deviceUID オーディオ出力デバイスの UID
 */
- (void)start:(NSString *)deviceUID;

/** オーディオ出力の一時停止

 オーディオ出力を、一時停止します。
 */
- (void)pause;

/** オーディオ出力の停止

 オーディオ出力を、停止します。
 */
- (void)stop;

/** オーディオ出力の音量取得

 オーディオ出力のゲインを取得します。範囲は 0.0 ～ 1.0 です。
 */
- (float)volume;

- (float)speed;
- (float)pitch;

/** オーディオ出力の音量設定

 オーディオ出力のゲインを設定します。

 @param gain 範囲は 0.0 ～ 1.0 です。
 */
- (void)setVolume:(float)gain;

- (void)setSpeed:(float)rate;
- (void)setPitch:(float)cent;

///-----------------------------------------------------------------------------
/// @name オーディオ出力ストリームの情報
///-----------------------------------------------------------------------------

/** オーディオ出力のチャンネル数 */
- (NSUInteger)numberOfChannels;

/** オーディオ出力のピーク値

 channelNumber で指定されたオーディオ出力のピーク値（dB）を返します。
 範囲は -120.0 〜 0.0 です。

 @param channelNumber チャンネル番号（0:左チャンネル, 1:右チャンネル）
 */
- (float)peakPowerForChannel:(NSUInteger)channelNumber;

/** オーディオ出力時間

 オーディオ出力を開始してからの時間（秒）を返します。一時停止中はカウントされません。
 */
- (NSTimeInterval)currentTime;

/** オーディオ出力ストリームの状態

 現在の状態を返します。以下のステータスが返ります。

  - kAudioOutputStatusStop
  - kAudioOutputStatusStart
  - kAudioOutputStatusPause
 */
- (int)status;

@end

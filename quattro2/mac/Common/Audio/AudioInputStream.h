//
//  AudioInputStream.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioToolbox.h>

enum {
    kAudioInputStatusStop,
    kAudioInputStatusStart,
    kAudioInputStatusPause
};

/** オーディオ入力ストリームのイベント通知を受け取るプロトコルです。 */
@protocol AudioInputStreamDelegate <NSObject>

///-----------------------------------------------------------------------------
/// @name オーディオ入力ストリームのイベント
///-----------------------------------------------------------------------------

@required

/** オーディオ入力データの取得通知

 オーディオ入力データを取得した時に呼ばれます。取得したデータは buffer に格納されています。

 @param buffer オーディオデータを格納しているバッファの先頭ポインタ
 @param length バッファのバイトサイズ
 */
- (void)inputStream:(u_int8_t *)buffer maxLength:(NSInteger)length;

@optional

/** オーディオ入力の停止通知

 AudioInputStream の stop:(BOOL)shouldStopImmediate を NO で停止した場合に、
 オーディオ入力が停止処理を終えたあとで呼び出されます。
 */
- (void)inputStreamDidClosed;

@end

/** オーディオ入力ストリームを管理するプロトコルです。 */
@protocol AudioInputStream <NSObject>

@required
- (void)ASBD:(AudioStreamBasicDescription *)audioFormat;

///-----------------------------------------------------------------------------
/// @name オーディオ入力ストリームの設定
///-----------------------------------------------------------------------------

/** オーディオ入力ストリームのイベント通知を受け取るデリゲート
 @param delegate AudioInputStreamDelegate プロトコルを実装したデリゲート
 */
- (void)setDelegate:(id<AudioInputStreamDelegate>)delegate;

///-----------------------------------------------------------------------------
/// @name オーディオ入力ストリームの操作
///-----------------------------------------------------------------------------

/** オーディオ入力の開始／再開

 オーディオ入力を、開始もしくは再開します。

 @param deviceUID オーディオ入力デバイスの UID
 */
- (void)start:(NSString *)deviceUID;

/** オーディオ入力の一時停止

 オーディオ入力を、一時停止します。
 */
- (void)pause;

/** オーディオ入力の停止

 オーディオ入力を停止します。

 @param shouldStopImmediate YES にセットすると、すぐに停止します（同期）。NO にした場合、
 ストリームが停止処理を終えたあとで、inputStreamDidClosed が呼ばれます（非同期）。
 */
- (void)stop:(BOOL)shouldStopImmediate;

/** オーディオ入力の音量取得

 現在のオーディオ入力ゲインを取得します。範囲は 0.0 ～ 1.0 です。
 */
- (float)volume;

/** オーディオ入力の音量設定

 オーディオ入力のゲインを設定します。

 @param gain 範囲は 0.0 ～ 1.0 です。
 */
- (void)setVolume:(float)gain;

///-----------------------------------------------------------------------------
/// @name オーディオ入力ストリームの情報
///-----------------------------------------------------------------------------

/** オーディオ入力のチャンネル数 */
- (NSUInteger)numberOfChannels;

/** オーディオ入力のピーク値

 channelNumber で指定されたオーディオ入力のピーク値（dB）を返します。
 範囲は -120.0 〜 0.0 です。

 @param channelNumber チャンネル番号（0:左チャンネル, 1:右チャンネル）
 */
- (float)peakPowerForChannel:(NSUInteger)channelNumber;

/** オーディオ入力時間

 オーディオ入力を開始してからの時間（秒）を返します。一時停止中はカウントされません。
 */
- (NSTimeInterval)currentTime;

/** オーディオ入力ストリームの状態

 現在の状態を返します。以下のステータスが返ります。

  - kAudioInputStatusStop
  - kAudioInputStatusStart
  - kAudioInputStatusPause
 */
- (int)status;

@end

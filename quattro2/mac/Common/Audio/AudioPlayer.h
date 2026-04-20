//
//  AudioPlayer.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <AudioToolbox/ExtendedAudioFile.h>
#import "AudioOutputStream.h"

/** オーディオ再生のイベント通知を受け取るプロトコルです */
@protocol AudioPlayerDelegate <NSObject>

@optional

///-----------------------------------------------------------------------------
/// @name オーディオ再生イベント
///-----------------------------------------------------------------------------

/** 曲の終わりに達した
 @param fileURL 再生したオーディオファイルのパス
 */
- (void)audioPlayerDidEndSong:(NSURL *)fileURL;

/** オーディオ再生が終了した
 @param fileURL 再生したオーディオファイルのパス
 */
- (void)audioPlayerDidFinishPlaying:(NSURL *)fileURL;

/** オーディオ再生中に、エラーが発生した
 @param fileURL 再生中のオーディオファイルのパス
 */
- (void)audioPlayerErrorDidOccur:(NSURL *)fileURL;

@end

/** オーディオ再生用のオブジェクトです。 */
@interface AudioPlayer : NSObject <AudioOutputStreamDelegate>

///-----------------------------------------------------------------------------
/// @name オーディオ再生の設定
///-----------------------------------------------------------------------------

/** オーディオ再生のイベント通知を受け取るデリゲート
 @see AudioPlayerDelegate
 */
@property (assign) id<AudioPlayerDelegate> delegate;

/** オーディオ再生で利用するオーディオ出力ストリーム
 @see AudioOutputStream
 */
@property (assign) id<AudioOutputStream> output;

/** オーディオ再生で利用するオーディオ出力デバイス
 @see AudioOutputStream
 */
@property (assign) NSString *device;

///-----------------------------------------------------------------------------
/// @name オーディオ再生の操作
///-----------------------------------------------------------------------------

/** オーディオファイルのオープン

 再生するオーディオファイルをオープンします。

 オープンに成功した場合は YES を、失敗した場合は NO を返します。

 @param fileURL 再生するオーディオファイルのパス
 */
- (BOOL)open:(NSURL *)fileURL;

/** オーディオファイルの再生

 オーディオファイルを、再生します。
 */
- (void)play;

/** 再生の一時停止

 オーディオファイルの再生を、一時停止します。
 */
- (void)pause;

/** 再生の停止

 オーディオファイルの再生を、停止します。
 */
- (void)stop;

/** オーディオ再生位置の変更

 オーディオ再生位置を変更します。

 @param time 変更する再生時間（秒）

 @note オーディオ再生中に、再生位置を変更すると、再生は停止します。
 */
- (void)locate:(NSTimeInterval)time;


/** オーディオ出力の音量

 オーディオ出力のゲインを調整します。範囲は 0.0 ～ 1.0 です。
 */
@property (assign) float volume;

@property (assign) float speed;
@property (assign) float pitch;

///-----------------------------------------------------------------------------
/// @name オーディオ再生の情報
///-----------------------------------------------------------------------------

/** オーディオファイルのパス

 現在オープンしているオーディオファイルのパスを返します。

 オープンしているファイルがない場合は、nil を返します。
 */
@property (readonly) NSURL *file;

/** オーディオ再生時間

 現在のオーディオ再生時間（秒）を返します。
 */
@property (readonly) NSTimeInterval currentTime;

/** オーディオのトータル時間

 オーディオファイルのトータル時間（秒）を返します。
 */
- (NSTimeInterval)totalTime;

/** オーディオ再生の状態

 現在の状態を返します。以下のステータスが返ります。

  - kAudioOutputStatusStop  (停止中)
  - kAudioOutputStatusStart (再生中)
  - kAudioOutputStatusPause (一時停止中)
 */
@property (readonly) int status;

/** オーディオ出力のチャンネル数 */
@property (readonly) NSUInteger numberOfChannels;

/** オーディオ出力のピーク値

 channelNumber で指定されたオーディオ出力のピーク値（dB）を返します。
 範囲は -120.0 〜 0.0 です。

 @param channelNumber チャンネル番号（0:左チャンネル, 1:右チャンネル）
 */
- (float)peakPowerForChannel:(NSUInteger)channelNumber;

@end

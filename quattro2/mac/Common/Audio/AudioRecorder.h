//
//  AudioRecorder.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioToolbox.h>
#import <AudioToolbox/ExtendedAudioFile.h>
#import "AudioInputStream.h"

enum RecordingFormat {
    kRecordingFormatAAC_256K,
    kRecordingFormatAAC_192K,
    kRecordingFormatAAC_128K,
    kRecordingFormatAAC_64K,
    kRecordingFormatWAV
};

/** オーディオ録音のイベント通知を受け取るプロトコルです。 */
@protocol AudioRecorderDelegate <NSObject>

@optional

///-----------------------------------------------------------------------------
/// @name オーディオ録音イベント
///-----------------------------------------------------------------------------

/** オーディオ録音が終了した
 @param fileURL オーディオ録音したファイルのパス
 */
- (void)audioRecorderDidFinishRecording:(NSURL *)fileURL;

/** オーディオ録音中に、エラーが発生した
 @param fileURL オーディオ録音したファイルのパス
 */
- (void)audioRecorderErrorDidOccur:(NSURL *)fileURL;

@end

/** オーディオ録音用のオブジェクトです。 */
@interface AudioRecorder : NSObject <AudioInputStreamDelegate>

///-----------------------------------------------------------------------------
/// @name オーディオ録音の設定
///-----------------------------------------------------------------------------

/** オーディオ録音のイベント通知を受け取るデリゲート
 @see AudioRecorderDelegate
 */
@property (assign) id<AudioRecorderDelegate> delegate;

/** オーディオ録音で利用するオーディオ入力ストリーム
 @see AudioInputStream
 */
@property (assign) id<AudioInputStream> input;

/** オーディオ録音で利用するオーディオ入力デバイス
 @see AudioInputStream
 */
@property (assign) NSString *device;

///-----------------------------------------------------------------------------
/// @name オーディオ録音の操作
///-----------------------------------------------------------------------------

/** オーディオ録音ファイルの作成

 オーディオ録音用のファイルを作成します。
 録音形式は、以下が指定できます。

  - kRecordingFormatAAC_256K
  - kRecordingFormatAAC_192K
  - kRecordingFormatAAC_128K
  - kRecordingFormatAAC_64K
  - kRecordingFormatWAV

 ファイルの作成に成功した場合は YES を、失敗した場合は NO を返します。
 
 @param fileURL 作成するファイルのパス
 @param format 録音形式
 */
- (BOOL)create:(NSURL *)fileURL format:(enum RecordingFormat)format;

/** オーディオの録音

 オーディオの録音を、開始します。
 */
- (void)record;

/** 録音の一時停止

 オーディオの録音を、一時停止します。
 */
- (void)pause;

/** 録音の停止

 オーディオの録音を、停止します。

 @param shouldStopImmediate YES にセットすると、すぐに録音を停止します（同期）。NO にした場合、
 ストリームが停止処理を終えたあとで、audioRecorderDidFinishRecording が呼ばれます（非同期）。
 */
- (void)stop:(BOOL)shouldStopImmediate;

/** オーディオ入力の音量

 オーディオの入力ゲインを調整します。範囲は 0.0 ～ 1.0 です。
 */
@property (assign) float volume;

///-----------------------------------------------------------------------------
/// @name オーディオ録音の情報
///-----------------------------------------------------------------------------

/** オーディオ録音ファイルのパス */
@property (readonly) NSURL *file;

/** オーディオ録音時間

 現在の録音時間（秒）を返します。
 */
@property (readonly) NSTimeInterval currentTime;

/** オーディオ録音の状態

 現在の状態を返します。以下のステータスが返ります。

  - kAudioInputStatusStop  (停止中)
  - kAudioInputStatusStart (録音中)
  - kAudioInputStatusPause (一時停止中)
 */
@property (readonly) int status;

/** オーディオ入力のチャンネル数 */
@property (readonly) NSUInteger numberOfChannels;

/** オーディオ入力のピーク値

 channelNumber で指定されたオーディオ入力のピーク値（dB）を返します。
 範囲は -120.0 〜 0.0 です。

 @param channelNumber チャンネル番号（0:左チャンネル, 1:右チャンネル）
 */
- (float)peakPowerForChannel:(NSUInteger)channelNumber;

@end

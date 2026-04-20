//
//  RWCDiscovery.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RWCProtocol.h"
#import "RWCNetServer.h"

/** 楽器が見つかった時に通知を受け取るためのプロトコルです。 */
@protocol RWCDiscoveryDelegate <NSObject>

@optional

/** 見つかった楽器の通知

 ネットワーク内に楽器を見つけた時に呼ばれます。楽器ごとに通知されます。

 @param device 楽器情報（辞書形式）
 */
- (void)discoveryDeviceDidFound:(NSDictionary *)device;

@end

/** 楽器を検索するためのオブジェクトです。 */
@interface RWCDiscovery : NSObject <RWCNetServerDelegate>

///-----------------------------------------------------------------------------
/// @name 検索
///-----------------------------------------------------------------------------

/** 楽器が見つかった時に通知を受け取るデリゲート
 @see RWCDiscoveryDelegate
 */
@property (assign) id<RWCDiscoveryDelegate> delegate;

/** 楽器を検索します。
 
 同じネットワーク内にある楽器の検索を開始します。関数はすぐに戻ります（非同期）。
 
 楽器が見つかると、デリゲートの discoveryDeviceDidFound で楽器情報（辞書形式）が通知されます。
 
 楽器情報は以下の辞書キーで取得できます。
 
 - RWCDeviceManufacturerKey : 製造元 (NSString)
 - RWCDeviceNameKey : 楽器名 (NSString)
 - RWCDeviceUIDKey : 楽器ごとのユニークID (NSString)
 - RWCDeviceImageKey : 推奨する楽器のイメージ (NSNumber)
  - RNP_IMAGE_UNKNOWN
  - RNP_IMAGE_PIANO
  - RNP_IMAGE_GRANDPIANO
  - RNP_IMAGE_ORGAN
  - RNP_IMAGE_SYNTHESIZER
  - RNP_IMAGE_ACCORDION
  - RNP_IMAGE_DRUM
  - RNP_IMAGE_PERCUSSION_SAMPLER
  - RNP_IMAGE_GUITAR
  - RNP_IMAGE_MIXER
  - RNP_IMAGE_COMPUTER
 - RWCDeviceCapsKey : 楽器のサポートする機能 (NSNumber）
  - RNP_CAPS_MIDI_IN : 楽器は MIDI IN 機能をサポートしている
  - RNP_CAPS_MIDI_OUT : 楽器は MIDI OUT 機能をサポートしている
  - RNP_CAPS_MIDI_STREAMING : 楽器は MIDI ストリーミング機能をサポートしている
  - RNP_CAPS_AUDIO_OUTPUT : 楽器はオーディオ出力機能をサポートしている
  - RNP_CAPS_AUDIO_INPUT : 楽器はオーディオ入力機能をサポートしている
  - RNP_CAPS_AUDIO_INPUT_MODE : 楽器はオーディオ入力モードの切り替えをサポートしている
 - RWCDeviceStatusKey : 楽器の状態 (NSNumber)
  - RNP_STATUS_LISTEN : 楽器は接続可能
  - RNP_STATUS_SESSION : 楽器は既に端末と通信中（接続不可）
  - RNP_STATUS_BUSY : 楽器は BUSY 状態のため接続不可
 
 @note 以前に接続した楽器と同じかどうかの判定をする場合は、RWCDeviceUIDKey で判別してください。
 
 @note 楽器の RWCDeviceStatusKeyキー値が RNP_STATUS_LISTEN 以外の場合には、楽器に接続しないでください。
 */
- (void)search;

@end

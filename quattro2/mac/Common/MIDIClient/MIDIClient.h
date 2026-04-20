//
//  MIDIClient.h
//
//  Copyright 2013 Roland Corporation. All rights reserved.
//

#import "MIDIInputPort.h"
#import "MIDIOutputPort.h"

#import "timestamp.h"

#if TARGET_OS_IPHONE
#ifdef USE_VENDER_BLEMIDI
#import "../../iOS/VenderBLEMIDI/BLEMIDIConnectionManager.h"
#endif
#endif

#ifdef USE_TGIF
#import "../Sound/TGIF.h"
#endif

//#define IGNORE_COREMIDI_NETWORK

extern NSString *const MIDIDeviceNameKey;
extern NSString *const MIDIEntityNameKey;
extern NSString *const MIDIEndpointUIDKey;
extern NSString *const MIDIEndpointIndexKey;

/**
 MIDI クライアントからの通知を受け取るためのプロトコル
 */
@protocol MIDIClientDelegate <NSObject>

@optional

/**
 MIDI 入力ポートの接続に失敗した
 @param endpoint MIDI エンドポイント（Source）
 */
- (void)midiInputPortConnectFailed:(NSDictionary*)endpoint;

/**
 MIDI 出力ポートの接続に失敗した
 @param endpoint MIDI エンドポイント（Destination）
 */
- (void)midiOutputPortConnectFailed:(NSDictionary*)endpoint;

/**
 MIDI デバイスの追加／削除の通知
 */
- (void)midiObjectAddedRemoved;

/**
 MIDI エラーが発生した
 @param error 発生したエラー
 */
- (void)midiErrorDidOccur:(NSError*)error;

@end

/**
 MIDIクライアントオブジェクト
 */
@interface MIDIClient : NSObject

/**
 MIDI クライアントからの通知を受け取るデリゲート
 @see MIDIClientDelegate
 */
@property (assign) id<MIDIClientDelegate> delegate;

@property (readonly) MIDIClientRef  clientRef;

/**
 MIDI 入力ポートを管理するオブジェクト
 @see MIDIInputPort
 */
@property (readonly) MIDIInputPort  *inputPort;

/**
 MIDI 出力ポートを管理するオブジェクト
 @see MIDIOutputPort
 */
@property (readonly) MIDIOutputPort *outputPort;

- (id)initWithUID:(int)uid;

- (void)errorDidOccur:(OSStatus)status message:(NSString*)reason;

+ (MIDIEntityRef)entityWithEndpointRef:(MIDIEndpointRef)endpointRef;
+ (MIDIDeviceRef)deviceWithEndpointRef:(MIDIEndpointRef)endpointRef;
+ (NSDictionary*)dictionaryWithMIDIObjectRef:(MIDIObjectRef)objRef;

@end

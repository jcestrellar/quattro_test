//
//  HTTPConnection.h
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "HTTPTask.h"

/** HTTP 接続のイベント通知を受け取るプロトコルです。 */
@protocol HTTPConnectionDelegate <NSObject>

@optional

///-----------------------------------------------------------------------------
/// @name ダウンロード／アップロード通知
///-----------------------------------------------------------------------------

/** ダウンロード／アップロードの進捗通知
 
 ダウンロード／アップロードの進捗状況を通知します。
 
 @param uid 処理識別子
 @param length ダウンロード／アップロードするファイルサイズ
 @param bytes 現在までにダウンロード／アップロードしたサイズ
 
 @warning ダウンロード先のファイルサイズが不明の場合は、lengthに -1 が入ります。
 */
- (void)connectionDidLoadData:(u_int32_t)uid contentLength:(NSInteger)length amount:(NSInteger)bytes;

/** ダウンロード／アップロードの完了通知

 ダウンロード／アップロードが完了すると呼ばれます。

 @param uid 処理識別子
 @param fileURL ダウンロード／アップロードしたファイルのパス
 */
- (void)connectionDidFinishLoading:(u_int32_t)uid file:(NSURL *)fileURL;

/** ダウンロード／アップロードでエラーが発生した

 @param uid 処理識別子
 @param url エラーの発生したダウンロード／アップロード先の URL
 */
- (void)connectionErrorDidOccur:(u_int32_t)uid url:(NSURL *)url;

@end

/** HTTP 接続を管理するオブジェクトです。 */
@interface HTTPConnection : NSObject

@property (assign) id<HTTPConnectionDelegate> delegate;

///-----------------------------------------------------------------------------
/// @name ファイルのダウンロード／アップロード
///-----------------------------------------------------------------------------

/** ダウンロードの開始

 指定した URL から、ファイルのダウンロードを開始します（非同期）。
 
 @param url ダウンロード先の URL
 @param fileURL 保存先のパス
 @return 処理識別子

 @note 保存先（fileURL）を指定しない場合は、自動的に /var/tmp 以下に保存されます。
 */
- (u_int32_t)download:(NSURL *)url to:(NSURL *)fileURL;

/** アップロードの開始
 
 指定した URL へ、ファイルのアップロードを開始します（非同期）。
 
 @param url アップロード先の URL
 @param fileURL アップロードするパス
 @return 処理識別子
 */
- (u_int32_t)upload:(NSURL *)url file:(NSURL *)fileURL;


/** ダウンロード／アップロードの中止

 実行中のダウンロード／アップロード処理を中止します。ダウンロードの場合、保存途中のファイルは、削除されます。

 @param uid 処理識別子
 */
- (void)cancel:(u_int32_t)uid;

- (void)didLoadData:(u_int32_t)uid contentLength:(NSInteger)length amount:(NSInteger)bytes;
- (void)didFinishLoading:(HTTPTask *)obj;
- (void)errorDidOccur:(HTTPTask *)obj;

@end

//
//  RWCNetClient.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol RWCNetClientDelegate

- (void)streamOpenCompleted;
- (void)streamOpenFailed;
- (void)streamErrorOccurred;
- (void)streamEndEncountered;

- (void)streamHasBytesAvailable:(NSInputStream *)istream;

@end

@interface RWCNetClient : NSObject <NSStreamDelegate>

@property (assign) id<RWCNetClientDelegate> delegate;
@property (assign) int connectTimeout;
@property (assign) int keepAliveTimeout;
@property (retain) NSInputStream *inputStream;
@property (retain) NSOutputStream *outputStream;

- (void)connectToServer:(NSString *)url portNo:(UInt32)port;

- (NSInteger)read:(u_int8_t *)buffer maxLength:(NSInteger)length;
- (NSInteger)write:(u_int8_t *)buffer maxLength:(NSInteger)length;

- (void)stopConnection;

@end

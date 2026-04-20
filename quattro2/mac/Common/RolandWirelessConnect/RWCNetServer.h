//
//  RWCNetServer.h
//
//  Copyright 2012 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

@class RWCNetServer;

@protocol RWCNetServerDelegate

- (void)streamEventOpenCompleted:(RWCNetServer *)session;
- (void)streamHasBytesAvailable:(RWCNetServer *)session stream:(NSInputStream *)istream;
- (void)streamHasSpaceAvailable:(RWCNetServer *)session stream:(NSOutputStream *)ostream;
- (void)streamErrorOccurred:(RWCNetServer *)session;
- (void)streamEndEncountered:(RWCNetServer *)session;

@end

@interface RWCNetServer : NSObject <NSStreamDelegate>

@property (assign) id<RWCNetServerDelegate> delegate;
@property (assign) int portNo;
@property (assign) BOOL multiclient;
@property (retain) NSData *clientAddress;
@property (retain) NSInputStream *inputStream;
@property (retain) NSOutputStream *outputStream;

- (id)initWithPortNo:(int)portNo;

- (void)startServer;
- (void)stopServer;
- (void)stopConnection;

@end

//
//  TCPIPClient.h
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol TCPIPClientDelegate <NSObject>

@required
- (void)received:(const u_int8_t *)buf size:(int)len;
- (BOOL)closed;

@end

@interface TCPIPClient : NSObject

@property (assign) id<TCPIPClientDelegate> delegate;
@property (readonly) int nativeSocket;

- (BOOL)connect:(NSString *)address port:(int)port;
- (void)start;
- (void)close;

- (int)send:(const void *)buf size:(int)len;

@end

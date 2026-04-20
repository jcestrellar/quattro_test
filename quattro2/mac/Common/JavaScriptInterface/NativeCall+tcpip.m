//
//  NativeCall+tcpip.m
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"tcpip";

@interface _TCPIPClientDelegate : NSObject <TCPIPClientDelegate>
@property (assign) int fd;
@property (assign) NSMutableDictionary *connections;
@end

@interface NativeCall (tcpip) @end

@implementation NativeCall (tcpip)

- (NSString *)$$tcpip_connect:(NSString *)param1 :(NSString *)param2
{
    TCPIPClient *conn = [[[TCPIPClient alloc] init] autorelease];
    if ([conn connect:param1 port:[param2 intValue]]) {
        _TCPIPClientDelegate *_delegate = [[_TCPIPClientDelegate alloc] init];
        int fd = conn.nativeSocket;
        _delegate.fd = fd;
        _delegate.connections = connections;
        conn.delegate = _delegate;
        @synchronized(connections) {
            [connections setObject:conn forKey:[NSNumber numberWithInt:fd]];
        }
        [conn start];
        return_d(fd);
    }
    return_d(-1);
}

- (NSString *)$$tcpip_write:(NSString *)param1 :(NSString *)param2
{
    int fd = [param1 intValue];
    NSData *data = dataWithHexString(param2);
    write(fd, [data bytes], (int)[data length]);
    undefined;
}

- (NSString *)$$tcpip_close:(NSString *)param1 :(NSString *)param2
{
    int fd = [param1 intValue];
    close(fd);
    undefined;
}

@end

@implementation _TCPIPClientDelegate

- (void)received:(const u_int8_t *)buf size:(int)len
{
    NSString *hexString = [hexStringWithBytes(buf, len) autorelease];
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d\f%@", OBJ_NAME, @"read", _fd, hexString];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}

- (BOOL)closed
{
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d", OBJ_NAME, @"closed", _fd];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];

    @synchronized(_connections) {
        [_connections removeObjectForKey:[NSNumber numberWithInt:_fd]];
    }
    return YES;
}

@end

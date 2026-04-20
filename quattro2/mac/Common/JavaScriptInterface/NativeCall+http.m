//
//  NativeCall+http.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"http";

@interface NativeCall (http) @end

@implementation NativeCall (http)

- (NSString *)$$http_download:(NSString *)param1 :(NSString *)param2
{ return_u([http download:[NSURL URLWithString:param1] to:(param2 ? [NSURL fileURLWithPath:param2] : nil)]); }

- (NSString *)$$http_upload:(NSString *)param1 :(NSString *)param2
{ return_u([http upload:[NSURL URLWithString:param1] file:[NSURL fileURLWithPath:param2]]); }

- (NSString *)$$http_cancel:(NSString *)param1 :(NSString *)param2
{ [http cancel:[param1 intValue]]; undefined; }

@end

@implementation _HTTPConnectionDelegate

- (void)connectionDidLoadData:(u_int32_t)uid contentLength:(NSInteger)length amount:(NSInteger)bytes
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%u\f%ld\f%ld", OBJ_NAME, @"progress", uid, (long)length, (long)bytes];
    [self.native postEvent:event];
}

- (void)connectionDidFinishLoading:(u_int32_t)uid file:(NSURL *)fileURL
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%u\f%@", OBJ_NAME, @"completed", uid, [fileURL path]];
    [self.native postEvent:event];
}

- (void)connectionErrorDidOccur:(u_int32_t)uid url:(NSURL *)url
{
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%u\f%@", OBJ_NAME, @"error", uid, [url absoluteString]];
    [self.native postEvent:event];
}

@end

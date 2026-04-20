//
//  HTTPTask.h
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

@class HTTPConnection;

@interface HTTPTask : NSObject <NSURLSessionDelegate, NSURLSessionDownloadDelegate>

@property (assign) u_int32_t uid;
@property (retain) NSURL *url;
@property (retain) NSURL *fileURL;

- (id)initWithHTTPConnection:(HTTPConnection *)http;
- (void)download;
- (void)upload;
- (void)cancel;

@end

//
//  HTTPTask.m
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#import "HTTPConnection.h"

@interface HTTPTask () {
    HTTPConnection      *_http;
    NSMutableURLRequest *_request;
    NSURLSession        *_session;

    NSInteger _contentLength;
    NSInteger _amount;
    BOOL _completed;
	BOOL _canceled;
}
@end

@implementation HTTPTask

- (id)initWithHTTPConnection:(HTTPConnection *)http
{
	if (self = [super init]) {
        _http = http;
        _contentLength = _amount = 0;
    }
	return self;
}

- (void)dealloc
{
    [self close];
    [super dealloc];
}

- (void)close
{
    [_session invalidateAndCancel];
    [_request release];

    _session = nil;
    _request = nil;
    self.url = nil;
    self.fileURL = nil;
}

- (void)cancel
{
	_canceled = YES;
	[self close];
}

- (void)error
{
	if (!_canceled) {
		[_http errorDidOccur:self];
		[self close];
	}
}

- (void)download
{
	BOOL success = true;

	BOOL directory;
	if ([[NSFileManager defaultManager] fileExistsAtPath:[self.fileURL path] isDirectory:&directory]) {
		if (directory) { [self error]; return; }
		success = [[NSFileManager defaultManager] removeItemAtURL:self.fileURL error:nil];
	}
	
    if (success) {
#if TARGET_OS_IPHONE
		NSURLSessionConfiguration *sessionConfiguration = [NSURLSessionConfiguration backgroundSessionConfigurationWithIdentifier:[[NSUUID UUID] UUIDString]];
#else
		NSURLSessionConfiguration *sessionConfiguration = [NSURLSessionConfiguration defaultSessionConfiguration];
#endif
		_session = [NSURLSession sessionWithConfiguration:sessionConfiguration
                                                              delegate:self
                                                         delegateQueue:[NSOperationQueue mainQueue]];
        success = (_session != nil);
    }

    if (success) {
        NSURLSessionDownloadTask *task = [_session downloadTaskWithURL:_url];
        [task resume];
        success = (task != nil);
    }

    if (!success) {
        [self error];
    }
}

- (void)upload
{
    BOOL success = true;

    if (success) {
        _request = [[NSMutableURLRequest alloc] initWithURL:_url cachePolicy:NSURLRequestReloadIgnoringLocalCacheData timeoutInterval:10];
        if (_request) {
            [_request setHTTPMethod:@"PUT"];
            [_request setValue:@"ROLAND" forHTTPHeaderField:@"User-Agent"];
            [_request setValue:@"application/octet-stream" forHTTPHeaderField:@"Content-Type"];
        }
        success = (_request != nil);
    }

    if (success) {
#if TARGET_OS_IPHONE
		NSURLSessionConfiguration *sessionConfiguration = [NSURLSessionConfiguration backgroundSessionConfigurationWithIdentifier:[[NSUUID UUID] UUIDString]];
#else
		NSURLSessionConfiguration *sessionConfiguration = [NSURLSessionConfiguration defaultSessionConfiguration];
#endif
        _session = [NSURLSession sessionWithConfiguration:sessionConfiguration
                                                 delegate:self
                                            delegateQueue:[NSOperationQueue mainQueue]];
        success = (_session != nil);
    }

    if (success) {
        NSURLSessionUploadTask *task = [_session uploadTaskWithRequest:_request fromFile:self.fileURL];
        [task resume];
        success = (task != nil);
    }

    if (!success) {
        [self error];
    }
}

- (void)URLSession:(NSURLSession *)session downloadTask:(nonnull NSURLSessionDownloadTask *)downloadTask didWriteData:(int64_t)bytesWritten totalBytesWritten:(int64_t)totalBytesWritten totalBytesExpectedToWrite:(int64_t)totalBytesExpectedToWrite
{
	if (totalBytesExpectedToWrite == NSURLSessionTransferSizeUnknown) { totalBytesExpectedToWrite = -1; }
	[_http didLoadData:_uid contentLength:(NSInteger)totalBytesExpectedToWrite amount:(NSInteger)totalBytesWritten];
}

- (void)URLSession:(NSURLSession *)session downloadTask:(NSURLSessionDownloadTask *)downloadTask didFinishDownloadingToURL:(NSURL *)location
{
	if (self.fileURL && ![[NSFileManager defaultManager] moveItemAtURL:location toURL:self.fileURL error:nil]) {
		[self error];
	}
}

- (void)URLSession:(NSURLSession *)session dataTask:(nonnull NSURLSessionDataTask *)dataTask didReceiveResponse:(nonnull NSURLResponse *)response completionHandler:(nonnull void (^)(NSURLSessionResponseDisposition))completionHandler
{
    NSInteger statusCode = ((NSHTTPURLResponse *)response).statusCode;

    if (statusCode != 200 && statusCode != 201) {
        completionHandler(NSURLSessionResponseCancel);
    } else {
        _contentLength = (NSInteger)[response expectedContentLength];
        completionHandler(NSURLSessionResponseAllow);
    }
}

- (void)URLSession:(NSURLSession *)session task:(nonnull NSURLSessionTask *)task didSendBodyData:(int64_t)bytesSent totalBytesSent:(int64_t)totalBytesSent totalBytesExpectedToSend:(int64_t)totalBytesExpectedToSend
{
    [_http didLoadData:_uid contentLength:(NSInteger)totalBytesExpectedToSend amount:(NSInteger)totalBytesSent];
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{
    if (error) {
        [self error];
    } else {
        _completed = YES;
        [_http didFinishLoading:self];
        [self close];
    }
}

@end

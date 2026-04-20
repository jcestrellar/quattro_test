//
//  NativeCall+util.m
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#else
#import <Cocoa/Cocoa.h>
#endif
#import <CommonCrypto/CommonCryptor.h>
#import "NativeCall.h"

//static NSString *const OBJ_NAME = @"util";

@interface NativeCall (util) @end

@implementation NativeCall (util)

- (NSString *)$$util_bytes:(NSString *)param1 :(NSString *)param2
{
	NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];
	return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);
}

- (NSString *)$$util_text:(NSString *)param1 :(NSString *)param2
{
	NSData *data = dataWithHexString(param1);
	return_s([[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] autorelease]);
}

@end

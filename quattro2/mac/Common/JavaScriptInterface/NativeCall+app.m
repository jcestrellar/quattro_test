//
//  NativeCall+app.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import <sys/utsname.h>
#elif TARGET_OS_MAC
#import <Cocoa/Cocoa.h>
#import <sys/sysctl.h>
#endif
#import "NativeCall.h"

#if TARGET_OS_IPHONE
static NSString *const OBJ_NAME = @"app";
#endif

@interface NativeCall (app) @end

@implementation NativeCall (app)

- (NSString *)$$app_device:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
	struct utsname systemInfo;
	uname(&systemInfo);
	UIDevice *device = [UIDevice currentDevice];
	return_s(JSONStringWithObject(@{
		@"model" : [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding],
		@"os" : [NSString stringWithFormat:@"%@ %@", [device systemName], [device systemVersion]],
		@"id" : [[[device identifierForVendor] UUIDString] lowercaseString]
	}));
#else
	NSString *model = @"(Mac)";
	size_t size = 0;
	sysctlbyname("hw.model", NULL, &size, NULL, 0);
	if (size) {
		char *buf = malloc(size * sizeof(char));
		sysctlbyname("hw.model", buf, &size, NULL, 0);
		model = [NSString stringWithCString:buf encoding:NSUTF8StringEncoding];
		free(buf);
	}
	NSOperatingSystemVersion ver = [[NSProcessInfo processInfo] operatingSystemVersion];
	NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
	NSString *uuidString = [defaults stringForKey:@"__deviceId"];
	if (!uuidString.length) {
		uuidString = [[NSUUID UUID] UUIDString];
		[defaults setObject:uuidString forKey:@"__deviceId"];
	}
	return_s(JSONStringWithObject(@{
		@"model" : model,
		@"os" : [NSString stringWithFormat:@"macOS %ld.%ld.%ld", (long)ver.majorVersion, (long)ver.minorVersion, (long)ver.patchVersion],
		@"id" : [uuidString lowercaseString]
	}));
#endif
}

- (NSString *)$$app_version:(NSString *)param1 :(NSString *)param2
{
	NSString * versionString = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
	NSString * buildString = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleVersion"];
	
#if TARGET_OS_IPHONE
	NSURL *documentDirectory = [[[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask] lastObject];
	NSString *path1 = documentDirectory.path;
	NSString *path2 = [[NSBundle mainBundle] pathForResource:@"PrivacyInfo" ofType:@"xcprivacy"];
	NSDate *cdate = [[[NSFileManager defaultManager] attributesOfItemAtPath:path1
		error:nil] objectForKey:NSFileCreationDate];
	NSDate *mdate = [[[NSFileManager defaultManager] attributesOfItemAtPath:path2
		error:nil] objectForKey:NSFileModificationDate];
#else
	NSArray *paths = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSSystemDomainMask, YES);
	NSString *path = [NSString pathWithComponents:@[paths.firstObject, @"Roland", [[NSBundle mainBundle] bundleIdentifier]]];
	if (![[NSFileManager defaultManager] fileExistsAtPath:path]) {
		path = [[NSBundle mainBundle] bundlePath];
	}
	NSDate *cdate = [[[NSFileManager defaultManager] attributesOfItemAtPath:path
		error:nil] objectForKey:NSFileCreationDate];
	NSDate *mdate = [[[NSFileManager defaultManager] attributesOfItemAtPath:path
		error:nil] objectForKey:NSFileModificationDate];
#endif

	NSTimeZone *UTC = [NSTimeZone timeZoneWithAbbreviation: @"UTC"];
	NSISO8601DateFormatOptions options =
		NSISO8601DateFormatWithInternetDateTime |
		NSISO8601DateFormatWithDashSeparatorInDate |
		NSISO8601DateFormatWithFractionalSeconds |
		NSISO8601DateFormatWithColonSeparatorInTime |
		NSISO8601DateFormatWithTimeZone;
	
	return_s(JSONStringWithObject(@{
		@"name"  : versionString,
		@"code"  : [NSNumber numberWithInt:[buildString intValue]],
		@"ctime" : [NSISO8601DateFormatter stringFromDate:cdate timeZone:UTC formatOptions:options],
		@"mtime" : [NSISO8601DateFormatter stringFromDate:mdate timeZone:UTC formatOptions:options]
	}));
}

- (NSString *)$$app_locale:(NSString *)param1 :(NSString *)param2
{
	return_s([NSLocale.preferredLanguages objectAtIndex:0]);
}

- (NSString *)$$app_storage:(NSString *)param1 :(NSString *)param2
{
	NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
	if (param1) {
		[defaults setObject:param1 forKey:@"pref"];
		[defaults synchronize];
		undefined;
	} else {
		return_s([defaults stringForKey:@"pref"]);
	}
}

- (NSString *)$$app_storage2:(NSString *)param1 :(NSString *)param2
{
	NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
	if (param2) {
		if ([param1 length] > 0) {
			[defaults setObject:param2 forKey:param1];
			[defaults synchronize];
		}
		undefined;
	} else {
		return_s(([param1 length] > 0) ? [defaults stringForKey:param1] : @"");
	}
}

- (NSString *)$$app_clipboard:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
		self.clipboard = param1;
		undefined;
	} else {
		return_s(self.clipboard);
	}
}

- (NSString *)$$app_getevent:(NSString *)param1 :(NSString *)param2
{
	@synchronized(_queue) {
		if ([_queue count] > 0) {
			NSString *event = [[[_queue objectAtIndex:0] retain] autorelease];
			[_queue removeObjectAtIndex:0];
			return_s(event);
		}
	}
	undefined;
}

- (NSString *)$$app_startevent:(NSString *)param1 :(NSString *)param2
{
	@synchronized(_queue) {
		if ((self.event = _triggered = [param1 boolValue])) {
			[self performSelectorOnMainThread:@selector(processEvent) withObject:nil waitUntilDone:NO];
		}
	}
	return_b(YES);
}

- (NSString *)$$app_importfile:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
	NSDictionary *options = @{
		@"filter" : dictionaryWithJSONString(param1),
		@"multiple" : [NSNumber numberWithBool:(param2 ? YES : NO)]
	};
    [[NSNotificationCenter defaultCenter] postNotificationName:@"importFile" object:options userInfo:nil];
#endif
    undefined;
}

- (NSString *)$$app_exportfile:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    [[NSNotificationCenter defaultCenter] postNotificationName:@"exportFile" object:param1 userInfo:nil];
#endif
    undefined;
}

- (NSString *)$$app_webauth:(NSString *)param1 :(NSString *)param2
{
    NSMutableArray *array = [NSMutableArray array];
    if (param1) { [array addObject:[NSURL URLWithString:param1]]; }
    if (param2) { [array addObject:param2]; }
    [[NSNotificationCenter defaultCenter] postNotificationName:WEB_AUTHENTICATION object:array userInfo:@{@"native":self}];
    undefined;
}

- (NSString *)$$app_barcode:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
	void (^handler)(BOOL granted) = ^(BOOL granted) {
		if (granted) {
			[[NSNotificationCenter defaultCenter] postNotificationName:@"barcodeScanner" object:nil userInfo:nil];
		} else {
			NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"command", @"barcode"];
			[self postEvent:event];
		}
	};
	[AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:handler];
#endif
    undefined;
}

- (NSString *)$$app_control:(NSString *)param1 :(NSString *)param2
{
    [[NSNotificationCenter defaultCenter] postNotificationName:NATIVE_CONTROL object:param1 userInfo:@{@"native":self}];
    undefined;
}

- (NSString *)$$app_locate:(NSString *)param1 :(NSString *)param2
{
    NSURL *url = [NSURL URLWithString:param1];
    [[NSNotificationCenter defaultCenter] postNotificationName:NATIVE_LOCATE object:url userInfo:@{@"native":self}];
    undefined;
}

- (NSString *)$$app_dragdrop:(NSString *)param1 :(NSString *)param2
{
    [[NSNotificationCenter defaultCenter] postNotificationName:ENABLE_DRAGDROP object:param1 userInfo:@{@"native":self}];
    undefined;
}

- (NSString *)$$app_dropfiles:(NSString *)param1 :(NSString *)param2
{
    return_s(JSONStringWithObject(self.dropfiles ? self.dropfiles : @[]));
}

- (NSString *)$$app_exit:(NSString *)param1 :(NSString *)param2
{
    [self performSelectorOnMainThread:@selector(exit) withObject:nil waitUntilDone:NO];
    undefined;
}

- (void)exit
{
#if !TARGET_OS_IPHONE
	[[NSApplication sharedApplication] terminate:nil];
#endif
}

@end

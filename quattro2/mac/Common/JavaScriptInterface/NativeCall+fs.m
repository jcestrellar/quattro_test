//
//  NativeCall+fs.m
//
//  Copyright 2015 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#import "../../iOS/OpenPanelController.h"
#import "../../iOS/SavePanelController.h"
#import "../../../contributed/ZipArchive/ZipArchive.h"
#elif TARGET_OS_MAC
#import <AppKit/AppKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#endif

#import "NativeCall.h"

static NSString *const OBJ_NAME = @"fs";

static NSString *const LocalFSVolumeKey     = @"volume";
static NSString *const LocalFSMountKey      = @"mount";

static NSString *const LocalFSNameKey       = @"name";
static NSString *const LocalFSSizeKey       = @"size";
static NSString *const LocalFSDirectoryKey  = @"directory";
static NSString *const LocalFSReadableKey   = @"readable";
static NSString *const LocalFSWritableKey   = @"writable";
static NSString *const LocalFSDeletableKey  = @"deletable";

static NSString *const LocalFSOffsetKey     = @"offset";
static NSString *const LocalFSLengthKey     = @"length";

#ifdef BUNDLE_IDENTIFIER
#define GET_BUNDLE_IDENTIFIER(x) _identifier_string(x)
#define _identifier_string(x) #x
#endif

@interface NativeCall (fs)
- (NSString *)searchLibraryPathInUserDomain;
- (NSDictionary *)attributes:(NSURL *)fileURL error:(NSError**)error;
- (BOOL)write:(NSURL *)fileURL data:(NSData *)data append:(BOOL)append exception:(NSException **)exception;
@end

@implementation NativeCall (fs)

- (NSString *)$$fs_separator:(NSString *)param1 :(NSString *)param2
{ return_s(@"/"); }

- (NSString *)$$fs_path:(NSString *)param1 :(NSString *)param2
{
	NSSearchPathDirectory directory = NSDocumentDirectory;

	if (!param1) {
		/* NSDocumentDirectory */
#if !TARGET_OS_IPHONE
	} else if ([param1 caseInsensitiveCompare:@"home"] == NSOrderedSame) {
		return_s([NSHomeDirectory() stringByAppendingString:@"/"]);
	} else if ([param1 caseInsensitiveCompare:@"documents"] == NSOrderedSame) {
		directory = NSDocumentDirectory;
	} else if ([param1 caseInsensitiveCompare:@"music"] == NSOrderedSame) {
		directory = NSMusicDirectory;
	} else if ([param1 caseInsensitiveCompare:@"movies"] == NSOrderedSame) {
		directory = NSMoviesDirectory;
	} else if ([param1 caseInsensitiveCompare:@"pictures"] == NSOrderedSame) {
		directory = NSPicturesDirectory;
	} else if ([param1 caseInsensitiveCompare:@"downloads"] == NSOrderedSame) {
		directory = NSDownloadsDirectory;
#endif
	} else if ([param1 caseInsensitiveCompare:@"library"] == NSOrderedSame) {
		return_s([self searchLibraryPathInUserDomain]);
	} else if ([param1 caseInsensitiveCompare:@"temporary"] == NSOrderedSame) {
		return_s(NSTemporaryDirectory());
    } else if ([param1 caseInsensitiveCompare:@"bundle"] == NSOrderedSame) {
        NSBundle *bundle;
#ifdef BUNDLE_IDENTIFIER
        bundle = [NSBundle bundleWithIdentifier:@GET_BUNDLE_IDENTIFIER(BUNDLE_IDENTIFIER)];
#else
        bundle = [NSBundle mainBundle];
#endif
        return_s([[bundle resourcePath] stringByAppendingString:@"/"]);
	}

	NSArray *paths = NSSearchPathForDirectoriesInDomains(directory, NSUserDomainMask, YES);
	if (!paths || !paths.count) {
		paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
	}
	return_s([[paths objectAtIndex:0] stringByAppendingString:@"/"]);
}

- (NSString *)$$fs_volumes:(NSString *)param1 :(NSString *)param2
{
    NSArray *properties = [NSArray arrayWithObjects: NSURLVolumeNameKey, nil];
    NSArray *volumes = [[NSFileManager defaultManager] mountedVolumeURLsIncludingResourceValuesForKeys:properties options:NSVolumeEnumerationSkipHiddenVolumes];

    NSMutableArray *array = [[[NSMutableArray alloc] init] autorelease];
    for (NSURL *url in volumes) {
        NSString *volumeName = nil;
        [url getResourceValue:&volumeName forKey:NSURLVolumeNameKey error:nil];
        [array addObject:[NSDictionary dictionaryWithObjectsAndKeys:
                          [url path], LocalFSMountKey,
                          volumeName, LocalFSVolumeKey,
                          nil]];
    }
    return_s(JSONStringWithObject(array));
}

- (NSString *)$$fs_contents:(NSString *)param1 :(NSString *)param2
{
	NSError *error = nil;
	NSArray *properties = [NSArray arrayWithObjects:
						   NSURLLocalizedNameKey,
						   NSURLFileSizeKey,
						   NSURLIsDirectoryKey,
						   NSURLIsReadableKey,
						   NSURLIsWritableKey,
						   NSURLIsSystemImmutableKey,
						   nil];
	NSArray *urls = [[NSFileManager defaultManager] contentsOfDirectoryAtURL:[NSURL fileURLWithPath:param1] includingPropertiesForKeys:properties options:NSDirectoryEnumerationSkipsSubdirectoryDescendants error:&error];
	if (!urls) {
		return_e(error.localizedDescription);
	}

	NSMutableArray *array = [[[NSMutableArray alloc] init] autorelease];
	for (NSURL *url in urls) {
        if ((param2.length > 0) && ![[url pathExtension] caseInsensitiveCompare:param2]) {
            continue;
        }
		NSDictionary *attr = [self attributes:url error:&error];
		if (attr) {
			[array addObject:attr];
		}
	}
	return_s(JSONStringWithObject(array));
}

- (NSString *)$$fs_stat:(NSString *)param1 :(NSString *)param2
{
	NSError *error = nil;
	NSDictionary *attr = [self attributes:[NSURL fileURLWithPath:param1] error:&error];
    if (attr) {
        return_s(JSONStringWithObject(attr));
    } else {
        return_e(error.localizedDescription);
    }
}

- (NSString *)$$fs_exec:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    if ([param1 hasPrefix:@"/"]) {
        [[NSNotificationCenter defaultCenter] postNotificationName:@"documentInteraction" object:[NSURL fileURLWithPath:param1] userInfo:nil];
    } else if ([param1 hasPrefix:@"http"]) {
        [[NSNotificationCenter defaultCenter] postNotificationName:@"openSafariView" object:[NSURL URLWithString:param1] userInfo:nil];
    } else {
        [self performSelectorOnMainThread:@selector(openURL:) withObject:param1 waitUntilDone:NO];
    }
#else
    NSURL *url = [param1 hasPrefix:@"/"] ? [NSURL fileURLWithPath:param1] : [NSURL URLWithString:param1];
    [[NSWorkspace sharedWorkspace] openURL:url];
#endif
    undefined;
}

- (NSString *)$$fs_mkdir:(NSString *)param1 :(NSString *)param2
{
	NSError *error = nil;
	if ([[NSFileManager defaultManager] createDirectoryAtURL:[NSURL fileURLWithPath:param1]
                                 withIntermediateDirectories:YES
                                                  attributes:nil
                                                       error:&error]) {
        return_s(@"");
    } else {
        return_e(error.localizedDescription);
    }
}

- (NSString *)$$fs_unlink:(NSString *)param1 :(NSString *)param2
{
	NSError *error = nil;
    if ([[NSFileManager defaultManager] removeItemAtURL:[NSURL fileURLWithPath:param1] error:&error]) {
        return_s(@"");
    } else {
        return_e(error.localizedDescription);
    }
}

- (NSString *)$$fs_copy:(NSString *)param1 :(NSString *)param2
{
	NSError *error = nil;
	if ([[NSFileManager defaultManager] copyItemAtURL:[NSURL fileURLWithPath:param1]
                                                toURL:[NSURL fileURLWithPath:param2] error:&error]) {
        return_s(@"");
    } else {
        return_e(error.localizedDescription);
    }
}

- (NSString *)$$fs_move:(NSString *)param1 :(NSString *)param2
{
	NSError *error = nil;
	if ([[NSFileManager defaultManager] moveItemAtURL:[NSURL fileURLWithPath:param1]
                                                toURL:[NSURL fileURLWithPath:param2] error:&error]) {
        return_s(@"");
    } else {
        return_e(error.localizedDescription);
    }
}

- (NSString *)$$fs_unzip:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
    BOOL success = NO;
#ifndef NO_ZIPARCHIVE
    ZipArchive* za = [[ZipArchive alloc] init];
    if ([za UnzipOpenFile:param1]) {
        success = [za UnzipFileTo:param2 overWrite:YES];
        [za UnzipCloseFile];
    }
    [za release];
#endif
    if (success == YES) {
        return_s(@"");
    } else {
        return_e(@"unzip failed.");
    }
#else
    NSPipe *pipe = [[NSPipe alloc] init];
    NSTask *unzip = [[NSTask alloc] init];

    [unzip setLaunchPath:@"/usr/bin/unzip"];
    [unzip setArguments:[NSArray arrayWithObjects:@"-u", @"-d", param2, param1, nil]];
    [unzip setStandardOutput:pipe];
    [unzip launch];
    [unzip waitUntilExit];
    int exitcode = [unzip terminationStatus];
    [unzip release];
    [pipe release];

    if (exitcode == 0) {
        return_s(@"");
    } else {
        return_e(@"unzip failed.");
    }
#endif
}

- (NSString *)$$fs_readString:(NSString *)param1 :(NSString *)param2
{
	NSError *error = nil;
    NSString *text = [NSString stringWithContentsOfURL:[NSURL fileURLWithPath:param1]
											  encoding:NSUTF8StringEncoding
												 error:&error];
    if (text) {
        return_s(text);
    } else {
        return_e(error.localizedDescription);
    }
}

- (NSString *)$$fs_readData:(NSString *)param1 :(NSString *)param2
{
    NSError *error = nil;
	NSData *data = nil;
	
    if (param2) {

		NSDictionary *dict = dictionaryWithJSONString(param2);
		int offset = [[dict objectForKey:LocalFSOffsetKey] intValue];
		int length = [[dict objectForKey:LocalFSLengthKey] intValue];

		NSFileHandle *fh = [NSFileHandle fileHandleForReadingFromURL:[NSURL fileURLWithPath:param1]
															   error:&error];
		if (!fh) return_e(error.localizedDescription);
		@try
		{
			[fh seekToFileOffset:offset];
			data = [fh readDataOfLength:length];
			[fh closeFile];
		}
		@catch (NSException *e)
		{
			[fh closeFile];
			return_e(e.reason);
		}
		return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);

	} else {
        data = [NSData dataWithContentsOfURL:[NSURL fileURLWithPath:param1]
									 options:NSDataReadingUncached
									   error:&error];
        if (data) {
            return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);
        } else {
            return_e(error.localizedDescription);
        }
    }
}

- (NSString *)$$fs_writeString:(NSString *)param1 :(NSString *)param2
{
	NSException *exception;
    if ([self write:[NSURL fileURLWithPath:param1] data:[param2 dataUsingEncoding:NSUTF8StringEncoding] append:NO exception:&exception]) {
        return_s(@"");
    } else {
        return_e(exception.reason);
    }
}

- (NSString *)$$fs_appendString:(NSString *)param1 :(NSString *)param2
{
	NSException *exception;
    if ([self write:[NSURL fileURLWithPath:param1] data:[param2 dataUsingEncoding:NSUTF8StringEncoding] append:YES exception:&exception]) {
        return_s(@"");
    } else {
        return_e(exception.reason);
    }
}

- (NSString *)$$fs_writeData:(NSString *)param1 :(NSString *)param2
{
	NSException *exception;
    if ([self write:[NSURL fileURLWithPath:param1] data:dataWithHexString(param2) append:NO exception:&exception]) {
        return_s(@"");
    } else {
        return_e(exception.reason);
    }
}

- (NSString *)$$fs_appendData:(NSString *)param1 :(NSString *)param2
{
	NSException *exception;
    if ([self write:[NSURL fileURLWithPath:param1] data:dataWithHexString(param2) append:YES exception:&exception]) {
        return_s(@"");
    } else {
        return_e(exception.reason);
    }
}

/* asynchronous methods */

- (NSString *)$$fs_openfilename:(NSString *)param1 :(NSString *)param2
{
    NSArray *filter = nil;
    if (param1) {
        NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];
        filter = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
    }
    NSArray *args = [NSArray arrayWithObjects:filter, param2, nil];
    [self performSelectorOnMainThread:@selector(openFilename:) withObject:args waitUntilDone:NO];
	undefined;
}

- (NSString *)$$fs_savefilename:(NSString *)param1 :(NSString *)param2
{
    NSArray *args = [NSArray arrayWithObjects:param1, param2, nil];
	[self performSelectorOnMainThread:@selector(saveFilename:) withObject:args waitUntilDone:NO];
	undefined;
}

- (NSString *)$$fs_choosefolder:(NSString *)param1 :(NSString *)param2
{
	[self performSelectorOnMainThread:@selector(chooseFolder:) withObject:param1 waitUntilDone:NO];
	undefined;
}

- (NSString *)$$fs_unmount:(NSString *)param1 :(NSString *)param2
{
    [self performSelectorOnMainThread:@selector(unmount:) withObject:param1 waitUntilDone:NO];
	undefined;
}

- (NSString *)$$fs_watch:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
	/* Not supported */
#elif TARGET_OS_MAC
	[fsEventObserver startObservingWithPath:param1];
#endif
	undefined;
}

#if TARGET_OS_IPHONE
- (void)openURL:(NSString *)url
{
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:url] options:@{} completionHandler:nil];
}
#endif

- (void)openFilename:(NSArray *)args
{
    NSArray *filter     = args.count > 0 ? [args objectAtIndex:0] : nil;
    NSString *directory = args.count > 1 ? [args objectAtIndex:1] : nil;

#if TARGET_OS_IPHONE
    OpenPanel *panel = [[OpenPanel alloc] init];
    panel.directory = directory;
    panel.filter = filter;
    [[NSNotificationCenter defaultCenter] postNotificationName:@"openFilename" object:panel userInfo:nil];
#else
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.directoryURL = (directory.length > 0) ? [NSURL fileURLWithPath:directory] : nil;
	if (filter.count > 0) {
		NSMutableArray<UTType *> *utis = [NSMutableArray array];
		for (NSString *extension in filter) {
			UTType *uti = [UTType typeWithFilenameExtension:extension];
			[utis addObject:uti];
		}
		panel.allowedContentTypes = utis;
	}
	NSURL *url = ([panel runModal] == NSModalResponseOK) ? [panel URL] : nil;

    NSString *event;
    event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"openfilename", (url ? [url path] : @"")];
    [self postEvent:event];
#endif
}

- (void)saveFilename:(NSArray *)args
{
    NSString *filename  = args.count > 0 ? [args objectAtIndex:0] : @"Untitled";
    NSString *extension = args.count > 1 ? [args objectAtIndex:1] : nil;

#if TARGET_OS_IPHONE
    SavePanel *panel = [[SavePanel alloc] init];
    panel.directory = filename.stringByDeletingLastPathComponent;
    panel.filename = filename.lastPathComponent;
    panel.extension = extension;
    [[NSNotificationCenter defaultCenter] postNotificationName:@"saveFilename" object:panel userInfo:nil];
#else
	NSSavePanel *panel = [NSSavePanel savePanel];
	if (filename.length > 0) {
        panel.directoryURL = [NSURL fileURLWithPath:filename.stringByDeletingLastPathComponent];
        panel.nameFieldStringValue = filename.lastPathComponent;
	}
	if (extension.length > 0) {
		UTType *uti = [UTType typeWithFilenameExtension:extension];
		panel.allowedContentTypes = @[uti];
	}
	NSURL *url = ([panel runModal] == NSModalResponseOK) ? [panel URL]: nil;

    NSString *event;
	event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"savefilename", (url ? [url path] : @"")];
    [self postEvent:event];
#endif
}

- (void)chooseFolder:(NSString *)directory
{
#if TARGET_OS_IPHONE
    SavePanel *panel = [[SavePanel alloc] init];
    panel.directory = directory;
    panel.canChooseDirectories = YES;
    [[NSNotificationCenter defaultCenter] postNotificationName:@"saveFilename" object:panel userInfo:nil];
#else
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.directoryURL = (directory.length > 0) ? [NSURL fileURLWithPath:directory] : nil;
    panel.canChooseFiles = NO;
    panel.canChooseDirectories = YES;
	NSURL *url = ([panel runModal] == NSModalResponseOK) ? [panel URL] : nil;

    NSString *event;
    event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"choosefolder", (url ? [[url path] stringByAppendingString:@"/"] : @"")];
    [self postEvent:event];
#endif
}

- (void)unmount:(NSString *)param1
{
#if TARGET_OS_IPHONE
    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"unmountfailed", param1, @"Not supported"];
    [self postEvent:event];
#else
    NSError *error = nil;
    BOOL success = [[NSWorkspace sharedWorkspace] unmountAndEjectDeviceAtURL:[NSURL fileURLWithPath:param1] error:&error];

    NSString *event;
    if (success) {
		event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"unmounted", param1];
	} else {
		event = [NSString stringWithFormat:@"%@\f%@\f%@\f%@", OBJ_NAME, @"unmountfailed", param1, error.localizedDescription];
	}
    [self postEvent:event];
#endif
}

- (NSString *)searchLibraryPathInUserDomain
{
	NSBundle *bundle;
#ifdef BUNDLE_IDENTIFIER
	bundle = [NSBundle bundleWithIdentifier:@GET_BUNDLE_IDENTIFIER(BUNDLE_IDENTIFIER)];
#else
	bundle = [NSBundle mainBundle];
#endif

#if TARGET_OS_IPHONE
	NSSearchPathDirectory directory = NSLibraryDirectory;
#else
	NSSearchPathDirectory directory = NSApplicationSupportDirectory;
#endif
	NSArray *paths = NSSearchPathForDirectoriesInDomains(directory, NSUserDomainMask, YES);
	if (!paths || !paths.count) {
		paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
	}
	NSString *path = [NSString stringWithFormat:@"%@/%@/", [paths objectAtIndex:0], [bundle bundleIdentifier]];
	if (![[NSFileManager defaultManager] fileExistsAtPath:path]) {
		[[NSFileManager defaultManager] createDirectoryAtURL:[NSURL fileURLWithPath:path]
								 withIntermediateDirectories:YES
												  attributes:nil
													   error:nil];
	}
	return path;
}

- (NSDictionary *)attributes:(NSURL *)fileURL error:(NSError**)error
{
	NSNumber *filesize  = @0;
	NSNumber *directory = @0;
	NSNumber *readable  = @0;
	NSNumber *writable  = @0;
	NSNumber *immutable = @0;

	BOOL success = YES;

	if (success) success = [fileURL getResourceValue:&filesize  forKey:NSURLFileSizeKey error:error];
	if (success) success = [fileURL getResourceValue:&directory forKey:NSURLIsDirectoryKey error:error];
	if (success) success = [fileURL getResourceValue:&readable  forKey:NSURLIsReadableKey error:error];
	if (success) success = [fileURL getResourceValue:&writable  forKey:NSURLIsWritableKey error:error];
	if (success) success = [fileURL getResourceValue:&immutable forKey:NSURLIsSystemImmutableKey error:error];

	return success ? [NSDictionary dictionaryWithObjectsAndKeys:
					  [[fileURL path] lastPathComponent], LocalFSNameKey,
					  filesize  ? filesize  : @0, LocalFSSizeKey,
					  directory ? directory : @0, LocalFSDirectoryKey,
					  readable  ? readable  : @0, LocalFSReadableKey,
					  writable  ? writable  : @0, LocalFSWritableKey,
					  [NSNumber numberWithBool:(![immutable boolValue])], LocalFSDeletableKey,
					  nil] : nil;
}

- (BOOL)write:(NSURL *)fileURL data:(NSData *)data append:(BOOL)append exception:(NSException **)exception
{
	BOOL success = NO;

    NSFileHandle *fh = [NSFileHandle fileHandleForWritingToURL:fileURL error:nil];

	@try
	{
		if (!fh) {
			if (![[NSFileManager defaultManager] createFileAtPath:[fileURL path] contents:data attributes:nil]) {
				[NSException raise:@"NSException" format:@"Failed to create file."];
			}
		} else {
            if (append) {
                [fh seekToEndOfFile];
            } else {
                [fh truncateFileAtOffset:0];
            }
			[fh writeData:data];
		}
		success = YES;
	}
	@catch (NSException *e)
	{
		*exception = e;
	}

	[fh closeFile];

	return success;
}

@end

#if TARGET_OS_IPHONE
@implementation OpenPanel
- (void)close
{
    NSString *event;
    event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"openfilename", (self.URL ? [self.URL path] : @"")];
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}
- (void)dealloc
{
    [_URL release];
    [_filter release];
    [_directory release];
    [super dealloc];
}
@end

@implementation SavePanel
- (void)close
{
    NSString *event;
    if (self.canChooseDirectories) {
        event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"choosefolder", (self.URL ? [[self.URL path] stringByAppendingString:@"/"] : @"")];
    } else {
        event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"savefilename", (self.URL ? [self.URL path] : @"")];
    }
    [[NSNotificationCenter defaultCenter] postNotificationName:POST_EVENT object:event userInfo:nil];
}
- (void)dealloc
{
    [_URL release];
    [_directory release];
    [_filename release];
    [_extension release];
    [super dealloc];
}
@end
#endif

#if !TARGET_OS_IPHONE
@implementation FSEventObserver

- (id)init
{
	if (self = [super init]) {
		_queue = dispatch_queue_create("jp.co.roland.quattro.fs.event.observer", DISPATCH_QUEUE_SERIAL);
	}
	return self;
}

- (void)dealloc
{
	[self stopObserving];
	dispatch_release(_queue);
	
	[super dealloc];
}

static void _FSEventStreamCallback(ConstFSEventStreamRef streamRef,
					 void *clientCallBackInfo,
					 size_t numEvents,
					 void *eventPaths,
					 const FSEventStreamEventFlags eventFlags[],
					 const FSEventStreamEventId eventIds[])
{
	NativeCall *native = (__bridge NativeCall*)clientCallBackInfo;
	
	NSMutableArray *paths = [NSMutableArray array];
	char **_eventPaths = eventPaths;
	for (int i = 0 ; i < numEvents ; i++) {
		NSString *path = [NSString stringWithUTF8String:_eventPaths[i]];
		if (![paths containsObject:path]) {
			[paths addObject:path];
		}
	}
	NSString *event = [NSString stringWithFormat:@"%@\f%@\f%@", OBJ_NAME, @"watch", JSONStringWithObject(paths)];
	[native postEvent:event];
}

- (void)startObservingWithPath:(NSString *)path
{
	[self stopObserving];
	
	if (path.length > 0) {
		FSEventStreamContext context = { 0 };
		context.info = (__bridge void *)self.native;
		_stream = FSEventStreamCreate(kCFAllocatorDefault,
									  _FSEventStreamCallback,
									  &context,
									  (__bridge CFArrayRef)@[path],
									  kFSEventStreamEventIdSinceNow,
									  0.5,
									  kFSEventStreamCreateFlagNone);
		
		FSEventStreamSetDispatchQueue(_stream, _queue);
		FSEventStreamStart(_stream);
	}
}

- (void)stopObserving
{
	if (_stream) {
		FSEventStreamStop(_stream);
		FSEventStreamInvalidate(_stream);
		FSEventStreamRelease(_stream);
		_stream = NULL;
	}
}

@end
#endif

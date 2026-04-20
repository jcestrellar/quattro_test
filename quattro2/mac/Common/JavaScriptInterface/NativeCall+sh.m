//
//  NativeCall+sh.m
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import <TargetConditionals.h>
#import "NativeCall.h"

#if TARGET_OS_IPHONE
    /* Not supported */
#elif TARGET_OS_MAC
#import <AppKit/AppKit.h>

static NSString *const OBJ_NAME = @"sh";

@interface ShellTask: NSObject {
    NSTask *_task;
    NSPipe *_pipe;
}
@property (assign) NativeCall *native;
@end

@implementation ShellTask

- (int)launchWithArguments:(NSArray *)args
{
    NSString *commandLine = [[args valueForKey:@"description"] componentsJoinedByString:@" "];

    _task = [[NSTask alloc] init];
    _pipe = [[NSPipe alloc] init];

    [_task setStandardOutput:_pipe];
    [_task setLaunchPath:@"/bin/sh"];
    [_task setArguments:[NSArray arrayWithObjects: @"-c", commandLine, nil]];

    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(readData:) name:NSFileHandleReadCompletionNotification object:nil];
    [[_pipe fileHandleForReading] readInBackgroundAndNotify];

    [_task launch];
    return [_task processIdentifier];
}

- (void)readData:(NSNotification *)notification
{
    NSData *data = [[notification userInfo] valueForKey:NSFileHandleNotificationDataItem];
    NSString *output = [[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] autorelease];

    NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d\f%@", OBJ_NAME, @"stdout", [_task processIdentifier], output];
    [self.native postEvent:event];

    if ([_task isRunning]) {
        [[_pipe fileHandleForReading] readInBackgroundAndNotify];
    } else {
        /* EOF */
        NSString *event = [NSString stringWithFormat:@"%@\f%@\f%d\f%@", OBJ_NAME, @"stdout", [_task processIdentifier], @""];
        [self.native postEvent:event];

        [[NSNotificationCenter defaultCenter] removeObserver:self];
        [_task release];
        [_pipe release];
        [self release];
    }
}

@end
#endif

@interface NativeCall (sh) @end

@implementation NativeCall (sh)

- (NSString *)$$sh_exec:(NSString *)param1 :(NSString *)param2
{
    int pid = 0;

#if TARGET_OS_IPHONE
	/* Not supported */
#elif TARGET_OS_MAC
    if (param1) {
        NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];
        NSArray *args = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
        if ([args count]) {
            ShellTask *task = [[ShellTask alloc] init];
            task.native = self;
            pid = [task launchWithArguments:args];
        }
    }
#endif

	return_d(pid);
}

- (NSString *)$$sh_kill:(NSString *)param1 :(NSString *)param2
{
#if TARGET_OS_IPHONE
	/* Not supported */
#elif TARGET_OS_MAC
    int pid = [param1 intValue];
    if (pid) {
        NSRunningApplication *app = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
        [app terminate];
    }
#endif
	undefined;
}

@end

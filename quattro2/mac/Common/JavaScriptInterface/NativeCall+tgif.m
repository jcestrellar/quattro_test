//
//  NativeCall+tgif.m
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#import "NativeCall.h"
#ifdef USE_TGIF
#import "../Sound/TGIF.h"
#endif

//static NSString *const OBJ_NAME = @"tgif";

@interface NativeCall (tgif) @end

@implementation NativeCall (tgif)

- (NSString *)$$tgif_device:(NSString *)param1 :(NSString *)param2
{
	if (param1) {
#ifdef USE_TGIF
		TGIF_SetDevice(param1);
#else
		undefined;
#endif
	}
#ifdef USE_TGIF
	return_s(TGIF_GetDevice());
#else
	return_s(@"");
#endif
}

- (NSString *)$$tgif_buffer:(NSString *)param1 :(NSString *)param2
{
	/* AudioUnit has no buffer */
	if (param1) {
		undefined;
	} else {
		return_d(-1);
	}
}

- (NSString *)$$tgif_param:(NSString *)param1 :(NSString *)param2
{
	if (param2) {
#ifdef USE_TGIF
		TGIF_SetValue((u_int32_t)[param1 intValue], [param2 intValue]);
#endif
		undefined;
	} else {
#ifdef USE_TGIF
		return_d(TGIF_GetValue((u_int32_t)[param1 intValue]));
#else
		return_d(0);
#endif
	}
}

- (NSString *)$$tgif_send:(NSString *)param1 :(NSString *)param2
{
#ifdef USE_TGIF
	NSData *data = dataWithHexString(param1);
	TGIF_MIDISend((u_int8_t *)data.bytes, (int)data.length, mach_absolute_time());
#endif
	undefined;
}

- (NSString *)$$tgif_thru:(NSString *)param1 :(NSString *)param2
{
#ifdef USE_TGIF
	TGIF_SetThru([param1 boolValue]);
#endif
	undefined;
}

@end

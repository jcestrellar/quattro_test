//
//  timestamp.c
//
//  Copyright (c) 2019 Roland Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "timestamp.h"

const uint64_t kNanosPerMillisecond = 1000000;
const uint64_t kNanosPerMicrosecond = 1000;

static mach_timebase_info_data_t base = { 0, 0 };

uint32_t nanos_timestamp_to_millis(uint64_t t)
{
    if (base.denom == 0) { mach_timebase_info(&base); }

    return (uint32_t)(t * base.numer / base.denom / kNanosPerMillisecond);
}

uint64_t nanos_timestamp_to_micros(uint64_t t)
{
    if (base.denom == 0) { mach_timebase_info(&base); }

    return (uint64_t)(t * base.numer / base.denom / kNanosPerMicrosecond);
}

uint64_t millis_timestamp_to_nanos(uint32_t millis)
{
    if (base.denom == 0) { mach_timebase_info(&base); }

    assert(base.numer != 0);

	return (uint64_t)millis * base.denom / base.numer * kNanosPerMillisecond;
}

uint32_t current_millis_timestamp(void)
{
	return nanos_timestamp_to_millis(mach_absolute_time());
}

uint64_t current_micros_timestamp(void)
{
	return nanos_timestamp_to_micros(mach_absolute_time());
}

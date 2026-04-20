//
//  timestamp.h
//
//  Copyright (c) 2019 Roland Corporation. All rights reserved.
//

#import <mach/mach_time.h>

#ifdef __cplusplus
extern "C" {
#endif

uint32_t current_millis_timestamp(void);
uint64_t current_micros_timestamp(void);

uint32_t nanos_timestamp_to_millis(uint64_t t);
uint64_t nanos_timestamp_to_micros(uint64_t t);
uint64_t millis_timestamp_to_nanos(uint32_t millis);

#ifdef __cplusplus
}
#endif

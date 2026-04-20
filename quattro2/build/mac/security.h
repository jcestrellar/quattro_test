#define SCRUMBLE_COEF0 0x94b8a0d9
#define SCRUMBLE_COEF1 0x13c25b53 // ~(SCRUMBLE_COEF0 + 0x02)
#define SCRUMBLE_COEF2 0xc0db3775 // ~(SCRUMBLE_COEF0 + 0x04)
#define SCRUMBLE_COEF3 0x4ff31b1f // ~(SCRUMBLE_COEF0 + 0x06)
#define SCRUMBLE_COEF4 0xca44a321 // ~(SCRUMBLE_COEF0 + 0x08)
#define SCRUMBLE_COEF5 0x150da4cb // ~(SCRUMBLE_COEF0 + 0x0a)
#define SCRUMBLE_COEF6 0x7bf21ced // ~(SCRUMBLE_COEF0 + 0x0c)
#define SCRUMBLE_COEF7 0x292672d7 // ~(SCRUMBLE_COEF0 + 0x0e)
#define SCRUMBLE_COEF8 0x608e3759 // ~(SCRUMBLE_COEF0 + 0x10)
#define SCRUMBLE_COEF9 0xfb2507c3 // ~(SCRUMBLE_COEF0 + 0x12)
#define SCRUMBLE_COEFA 0x5012bce5 // ~(SCRUMBLE_COEF0 + 0x14)
#define SCRUMBLE_COEFB 0xeab68e0f // ~(SCRUMBLE_COEF0 + 0x16)
#define SCRUMBLE_COEFC 0xe4925011 // ~(SCRUMBLE_COEF0 + 0x18)

#define __SCRUMBLE(d0, d1, d2, d3, d4, d5, d6, d7, a, b, c) \
	(unsigned char)(((((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))>>16)&0xffff)|((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))&0xffff)<<16))*b)>>24), \
	(unsigned char)(((((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))>>16)&0xffff)|((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))&0xffff)<<16))*b)>>16), \
	(unsigned char)(((((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))>>16)&0xffff)|((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))&0xffff)<<16))*b)>> 8), \
	(unsigned char)(((((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))>>16)&0xffff)|((((unsigned)(d0<<24|d1<<16|d2<<8|d3)*(a*1ULL))&0xffff)<<16))*b)>> 0), \
	(unsigned char)(((((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))>>16)&0xffff)|((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))&0xffff)<<16))*c)>>24), \
	(unsigned char)(((((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))>>16)&0xffff)|((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))&0xffff)<<16))*c)>>16), \
	(unsigned char)(((((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))>>16)&0xffff)|((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))&0xffff)<<16))*c)>> 8), \
	(unsigned char)(((((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))>>16)&0xffff)|((((unsigned)(d4<<24|d5<<16|d6<<8|d7)*(a+2ULL))&0xffff)<<16))*c)>> 0),

#define SCRUMBLE_KEY1(d0, d1, d2, d3, d4, d5, d6, d7) \
	__SCRUMBLE(d3, d2, d1, d0, d7, d6, d5, d4, (SCRUMBLE_COEF0+0x02), SCRUMBLE_COEF1, SCRUMBLE_COEF2)
#define SCRUMBLE_KEY2(d0, d1, d2, d3, d4, d5, d6, d7) \
	__SCRUMBLE(d3, d2, d1, d0, d7, d6, d5, d4, (SCRUMBLE_COEF0+0x06), SCRUMBLE_COEF3, SCRUMBLE_COEF4)
#define SCRUMBLE_KEY3(d0, d1, d2, d3, d4, d5, d6, d7) \
	__SCRUMBLE(d3, d2, d1, d0, d7, d6, d5, d4, (SCRUMBLE_COEF0+0x0a), SCRUMBLE_COEF5, SCRUMBLE_COEF6)
#define SCRUMBLE_KEY4(d0, d1, d2, d3, d4, d5, d6, d7) \
	__SCRUMBLE(d3, d2, d1, d0, d7, d6, d5, d4, (SCRUMBLE_COEF0+0x0e), SCRUMBLE_COEF7, SCRUMBLE_COEF8)
#define SCRUMBLE_KEY5(d0, d1, d2, d3, d4, d5, d6, d7) \
	__SCRUMBLE(d3, d2, d1, d0, d7, d6, d5, d4, (SCRUMBLE_COEF0+0x12), SCRUMBLE_COEF9, SCRUMBLE_COEFA)
#define SCRUMBLE_KEY6(d0, d1, d2, d3, d4, d5, d6, d7) \
	__SCRUMBLE(d3, d2, d1, d0, d7, d6, d5, d4, (SCRUMBLE_COEF0+0x16), SCRUMBLE_COEFB, SCRUMBLE_COEFC)

#define DESCRUMBLE_KEY(buf, KEY) \
	do { \
		unsigned int COEF[] = { \
            (unsigned int)(SCRUMBLE_COEF1 - SCRUMBLE_COEF0), \
			(unsigned int)(SCRUMBLE_COEF2 - SCRUMBLE_COEF1), \
			(unsigned int)(SCRUMBLE_COEF3 - SCRUMBLE_COEF2), \
			(unsigned int)(SCRUMBLE_COEF4 - SCRUMBLE_COEF3), \
			(unsigned int)(SCRUMBLE_COEF5 - SCRUMBLE_COEF4), \
			(unsigned int)(SCRUMBLE_COEF6 - SCRUMBLE_COEF5), \
			(unsigned int)(SCRUMBLE_COEF7 - SCRUMBLE_COEF6), \
			(unsigned int)(SCRUMBLE_COEF8 - SCRUMBLE_COEF7), \
			(unsigned int)(SCRUMBLE_COEF9 - SCRUMBLE_COEF8), \
			(unsigned int)(SCRUMBLE_COEFA - SCRUMBLE_COEF9), \
			(unsigned int)(SCRUMBLE_COEFB - SCRUMBLE_COEFA), \
			(unsigned int)(SCRUMBLE_COEFC - SCRUMBLE_COEFB) \
		}; \
		unsigned int coef1, coef2; size_t c = sizeof(COEF) / sizeof(COEF[0]); \
		unsigned char *p = buf; const unsigned char *q = KEY; \
		for (int n = 0; n < KEY ## _LEN; n += 4) { \
			@try { \
				unsigned int v = 0; \
				for (int i = 0; i < 4; i++) { v <<= 8; v |= *q++; } \
				[NSException raise:@"_" format:@"%d", v]; \
			} @catch (NSException *e) { \
				unsigned int v = [e.reason intValue]; \
				if (c == sizeof(COEF) / sizeof(COEF[0])) { \
					c = 0; coef1 = SCRUMBLE_COEF0; coef2 = coef1; \
				} \
				coef1 += 2; coef2 += COEF[c++]; \
				v *= coef1; v = (v >> 16) | (v << 16); v *= coef2; \
				for (int i = 0; i < 4; i++) { *p++ = (unsigned char)(v); v >>= 8; } \
			} \
		} \
	} while (0);


#define APP_CRYPTO_SEED_LEN (sizeof(APP_CRYPTO_SEED))

static const unsigned char APP_CRYPTO_SEED[] = {

	SCRUMBLE_KEY1( 'j', 'p', '.', 'c', 'o', '.', 'r', 'o' )
	SCRUMBLE_KEY2( 'l', 'a', 'n', 'd', '.', 'q', 'u', 'a' )
	SCRUMBLE_KEY3( 't', 't', 'r', 'o',  0,   0,   0,   0  ) /* null terminator is required */

};

#define LIBTG_ACTIVATION_KEY_LEN (sizeof(LIBTG_ACTIVATION_KEY))

static const unsigned char LIBTG_ACTIVATION_KEY[] = {

	/*
	 * > echo -n "Your App bundle identifier" > message
	 * > openssl dgst -sha256 -sign libtg_private_key.pem message | openssl asn1parse -inform der
	 *       SEQUENCE
	 *       INTEGER : ... (32 bytes)
	 *       INTEGER : ... (32 bytes)
	 */

#if TARGET_OS_IPHONE
	SCRUMBLE_KEY1( 0xa0, 0x97, 0x46, 0x01, 0xfe, 0x15, 0x56, 0x6c )
	SCRUMBLE_KEY2( 0x9d, 0xfb, 0xad, 0x8a, 0x9a, 0x98, 0xd9, 0x5a )
	SCRUMBLE_KEY3( 0x17, 0x26, 0x5e, 0xbc, 0xce, 0xc7, 0x26, 0xfb )
	SCRUMBLE_KEY4( 0x6f, 0x98, 0x28, 0xbe, 0x86, 0xa3, 0x3a, 0xeb )
	SCRUMBLE_KEY5( 0x30, 0xff, 0x12, 0xd6, 0x8c, 0x13, 0x3f, 0xd1 )
	SCRUMBLE_KEY6( 0xce, 0x60, 0x99, 0x27, 0x0d, 0xb1, 0x01, 0xb5 )
	SCRUMBLE_KEY1( 0x47, 0xbe, 0x1d, 0xb0, 0xf9, 0xfb, 0xd0, 0x54 )
	SCRUMBLE_KEY2( 0x73, 0x65, 0x47, 0x36, 0xd9, 0x92, 0x6d, 0x25 )
#elif TARGET_OS_MAC
	SCRUMBLE_KEY1( 0x19, 0x9a, 0x68, 0x8d, 0xe8, 0xc4, 0x6f, 0x8d )
	SCRUMBLE_KEY2( 0x73, 0xb1, 0xab, 0xbf, 0x5b, 0x9e, 0x94, 0x14 )
	SCRUMBLE_KEY3( 0x79, 0xa1, 0x02, 0x17, 0x8b, 0x2b, 0x7b, 0xb2 )
	SCRUMBLE_KEY4( 0xa5, 0xb2, 0x0d, 0x43, 0xb6, 0x18, 0x99, 0xa6 )
	SCRUMBLE_KEY5( 0x40, 0x15, 0xc4, 0x81, 0x98, 0x49, 0x90, 0x59 )
	SCRUMBLE_KEY6( 0x28, 0xfd, 0xff, 0x1d, 0xd5, 0xb7, 0xad, 0x40 )
	SCRUMBLE_KEY1( 0xcf, 0x35, 0xe3, 0xe1, 0xc3, 0x56, 0x02, 0xe1 )
	SCRUMBLE_KEY2( 0x10, 0xa1, 0xf3, 0xfb, 0xfe, 0x39, 0xf2, 0x89 )
#endif

};

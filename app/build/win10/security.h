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
			try { \
				unsigned int v = 0; \
				for (int i = 0; i < 4; i++) { v <<= 8; v |= *q++; } \
				throw v; \
			} catch (unsigned int v) { \
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

#ifdef NDEBUG
	/*
	 * PS> Get-ChildItem -Path "Cert:\CurrentUser\My"
	 *      ( Get the Thumbprint value of "CN=Roland Corporation". )
	 * PS> $cert = Get-ChildItem -Path "Cert:\CurrentUser\My\{Thumbprint}"
	 * PS> Export-Certificate -Cert $cert -FilePath tmp.cer
	 * > openssl dgst -sha256 -sign libtg_private_key.pem tmp.cer | openssl asn1parse -inform der
	 *       SEQUENCE
	 *       INTEGER : ... (32 bytes)
	 *       INTEGER : ... (32 bytes)
	 */
	SCRUMBLE_KEY1( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
	SCRUMBLE_KEY2( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
	SCRUMBLE_KEY3( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
	SCRUMBLE_KEY4( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
	SCRUMBLE_KEY5( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
	SCRUMBLE_KEY6( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
	SCRUMBLE_KEY1( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
	SCRUMBLE_KEY2( 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 )
#else
	/*
	 * PS> $cert = Get-PfxCertificate -FilePath build\win10\debug.pfx (password:quattro)
	 * PS> Export-Certificate -Cert $cert -FilePath tmp.cer
	 * > openssl dgst -sha256 -sign libtg_private_key.pem tmp.cer | openssl asn1parse -inform der
	 *       SEQUENCE
	 *       INTEGER : ... (32 bytes)
	 *       INTEGER : ... (32 bytes)
	 */
	SCRUMBLE_KEY1( 0x99, 0x3E, 0x9F, 0x87, 0xD4, 0x89, 0xCC, 0x2E )
	SCRUMBLE_KEY2( 0x7C, 0xD3, 0x9B, 0x34, 0x3B, 0xF7, 0x4A, 0xF3 )
	SCRUMBLE_KEY3( 0x6A, 0x8C, 0xC4, 0x9C, 0xAD, 0x73, 0x5C, 0xFE )
	SCRUMBLE_KEY4( 0x94, 0xD6, 0x28, 0x6A, 0x57, 0x89, 0xDF, 0x07 )
	SCRUMBLE_KEY5( 0xAD, 0xFE, 0x39, 0xEC, 0xF1, 0x42, 0x9B, 0xCD )
	SCRUMBLE_KEY6( 0x14, 0x8D, 0x27, 0x8D, 0xA3, 0xA8, 0x4C, 0x8B )
	SCRUMBLE_KEY1( 0x61, 0xE2, 0xFB, 0xC6, 0xE3, 0x81, 0x7A, 0x0D )
	SCRUMBLE_KEY2( 0xE0, 0xC0, 0x06, 0x93, 0x2D, 0x59, 0x28, 0xC3 )
#endif

};

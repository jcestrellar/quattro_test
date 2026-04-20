//
//  NativeCall+security.m
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
#import <CommonCrypto/CommonDigest.h>
#import "NativeCall.h"
#import "security.h"

//static NSString *const OBJ_NAME = @"security";

#define BUFSIZE	64

@interface NativeCall (security) @end

@implementation NativeCall (security)

- (NSString *)$$security_kiv:(NSString *)param1 :(NSString *)param2
{
	return_s(derivateKey(dataWithHexString(param1)));
}

- (NSString *)$$security_uuidgen:(NSString *)param1 :(NSString *)param2
{
	return_s([[NSUUID UUID] UUIDString]);
}

- (NSString *)$$security_md5:(NSString *)param1 :(NSString *)param2
{
	NSData *data = ([param1 rangeOfString:@"/"].location == NSNotFound) ?
		/* from data */		dataWithHexString(param1) :
		/* from file */		[NSData dataWithContentsOfURL:[NSURL fileURLWithPath:param1]];
    if (![data length]) return_s(@"");
    unsigned char md5Buffer[CC_MD5_DIGEST_LENGTH];
	CC_MD5([data bytes], (int)[data length], md5Buffer);
	return_s([hexStringWithBytes(md5Buffer, CC_MD5_DIGEST_LENGTH) autorelease]);
}

- (NSString *)$$security_encipher:(NSString *)param1 :(NSString *)param2
{
    NSData *data = [param1 dataUsingEncoding:NSUTF8StringEncoding];

	NSArray *kiv = [derivateKey(nil) componentsSeparatedByString:@"/"];
	NSData  *key = (kiv.count > 0) ? dataWithHexString([kiv objectAtIndex:0]) : nil;
	NSData  *iv  = (kiv.count > 1) ? dataWithHexString([kiv objectAtIndex:1]) : nil;

#if TARGET_OS_IPHONE
	uuid_t uuid;
	[[[UIDevice currentDevice] identifierForVendor] getUUIDBytes:uuid];
	NSData *UUID = [NSData dataWithBytes:uuid length:sizeof(uuid)];
#else
	NSData *UUID = macOSUUID();
#endif

	data = Crypt(kCCEncrypt, kCCAlgorithmAES128, 0, kCCKeySizeAES128, data, UUID, nil);
	if (data) {
		data = Crypt(kCCEncrypt, kCCAlgorithmAES128, 0, kCCKeySizeAES128, data, key, iv);
		if (data) {
			return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);
		}
	}
	return_s(@"");
}

- (NSString *)$$security_decipher:(NSString *)param1 :(NSString *)param2
{
    NSData *data = dataWithHexString(param1);

	NSArray *kiv = [derivateKey(nil) componentsSeparatedByString:@"/"];
	NSData  *key = (kiv.count > 0) ? dataWithHexString([kiv objectAtIndex:0]) : nil;
	NSData  *iv  = (kiv.count > 1) ? dataWithHexString([kiv objectAtIndex:1]) : nil;

#if TARGET_OS_IPHONE
	uuid_t uuid;
	[[[UIDevice currentDevice] identifierForVendor] getUUIDBytes:uuid];
	NSData *UUID = [NSData dataWithBytes:uuid length:sizeof(uuid)];
#else
	NSData *UUID = macOSUUID();
#endif

	data = Crypt(kCCDecrypt, kCCAlgorithmAES128, 0, kCCKeySizeAES128, data, key, iv);
	if (data) {
		data = Crypt(kCCDecrypt, kCCAlgorithmAES128, 0, kCCKeySizeAES128, data, UUID, nil);
		if (data) {
			return_s([[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] autorelease]);
		}
	}
	return_s(@"");
}

- (NSString *)$$security_aesencrypt:(NSString *)param1 :(NSString *)param2
{
	NSData *data = dataWithHexString(param1);

	if (!param2) param2 = derivateKey(nil);
	NSArray *kiv = [param2 componentsSeparatedByString:@"/"];
	NSData  *key = (kiv.count > 0) ? dataWithHexString([kiv objectAtIndex:0]) : nil;
	NSData  *iv  = (kiv.count > 1) ? dataWithHexString([kiv objectAtIndex:1]) : nil;

	data = Crypt(kCCEncrypt, kCCAlgorithmAES128, 0, kCCKeySizeAES128, data, key, iv);
	if (data) {
		return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);
	}
	return_s(@"");
}
- (NSString *)$$security_aesdecrypt:(NSString *)param1 :(NSString *)param2
{
	NSData *data = dataWithHexString(param1);

    if (!param2) param2 = derivateKey(nil);
    NSArray *kiv = [param2 componentsSeparatedByString:@"/"];
	NSData  *key = (kiv.count > 0) ? dataWithHexString([kiv objectAtIndex:0]) : nil;
	NSData  *iv  = (kiv.count > 1) ? dataWithHexString([kiv objectAtIndex:1]) : nil;

	data = Crypt(kCCDecrypt, kCCAlgorithmAES128, 0, kCCKeySizeAES128, data, key, iv);
	if (data) {
		return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);
	}
	return_s(@"");
}
- (NSString *)$$security_desencrypt:(NSString *)param1 :(NSString *)param2
{
	NSData *data = dataWithHexString(param1);

    if (!param2) param2 = derivateKey(nil);
    NSArray *kiv = [param2 componentsSeparatedByString:@"/"];
	NSData  *key = (kiv.count > 0) ? dataWithHexString([kiv objectAtIndex:0]) : nil;
	NSData  *iv  = (kiv.count > 1) ? dataWithHexString([kiv objectAtIndex:1]) : nil;

	data = Crypt(kCCEncrypt, kCCAlgorithm3DES, kCCOptionECBMode, kCCKeySize3DES, data, key, iv);
	if (data) {
		return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);
	}
	return_s(@"");
}
- (NSString *)$$security_desdecrypt:(NSString *)param1 :(NSString *)param2
{
	NSData *data = dataWithHexString(param1);

    if (!param2) param2 = derivateKey(nil);
    NSArray *kiv = [param2 componentsSeparatedByString:@"/"];
	NSData  *key = (kiv.count > 0) ? dataWithHexString([kiv objectAtIndex:0]) : nil;
	NSData  *iv  = (kiv.count > 1) ? dataWithHexString([kiv objectAtIndex:1]) : nil;

	data = Crypt(kCCDecrypt, kCCAlgorithm3DES, kCCOptionECBMode, kCCKeySize3DES, data, key, iv);
	if (data) {
		return_s([hexStringWithBytes([data bytes], (int)[data length]) autorelease]);
	}
	return_s(@"");
}

static NSString *derivateKey(NSData *salt)
{
	enum { len = APP_CRYPTO_SEED_LEN };
	unsigned char password[len];
	DESCRUMBLE_KEY(password, APP_CRYPTO_SEED);
	int seedlen = (int)strlen((char*)password);

	unsigned char buf[(CC_MD5_DIGEST_LENGTH * 2) + len + 8];
	bzero(buf, sizeof(buf));
	unsigned char *seed = buf + (CC_MD5_DIGEST_LENGTH * 2);
	unsigned char *key  = buf + (CC_MD5_DIGEST_LENGTH);
	unsigned char *iv   = buf;

	memcpy(seed, password, seedlen);
	if (salt) {
		int saltlen = (int)[salt length];
        if (saltlen > 8) saltlen = 8;
        memcpy(seed + seedlen, [salt bytes], saltlen);
		seedlen += 8;
	}
	CC_MD5(seed, seedlen, key);
	CC_MD5(key, CC_MD5_DIGEST_LENGTH + seedlen, iv);

	return [NSString stringWithFormat:@"%@/%@",
		[hexStringWithBytes(key, CC_MD5_DIGEST_LENGTH) autorelease],
		[hexStringWithBytes(iv,  CC_MD5_DIGEST_LENGTH) autorelease]];
}

static NSData *Crypt(CCOperation op, CCAlgorithm alg, CCOptions mode,
					 size_t keyLength, NSData *data, NSData *key, NSData *iv)
{
	char keyData[BUFSIZE];
	bzero(keyData, sizeof(keyData));
	if (key) [key getBytes:keyData length:BUFSIZE];

	char ivData[BUFSIZE];
	bzero(ivData, sizeof(ivData));
	if (iv) [iv getBytes:ivData length:BUFSIZE];

	NSUInteger dataLength = [data length];
	size_t bufferSize = dataLength + BUFSIZE;
	void *buffer = malloc(bufferSize);

	size_t numBytes = 0;
	CCCryptorStatus cryptStatus = CCCrypt(op, alg, mode | kCCOptionPKCS7Padding,
										  keyData, keyLength,
										  ivData,
										  [data bytes], dataLength,
										  buffer, bufferSize,
										  &numBytes);
	if (cryptStatus == kCCSuccess) {
		data = [NSData dataWithBytes:buffer length:numBytes];
	} else {
		data = nil;
	}

	free(buffer);
	return data;
}

#if !TARGET_OS_IPHONE
static NSData *macOSUUID(void)
{
	io_service_t platformExpert = IOServiceGetMatchingService(kIOMainPortDefault,
															  IOServiceMatching("IOPlatformExpertDevice"));
	CFStringRef serialNumberAsCFString = NULL;

	if (platformExpert) {
		serialNumberAsCFString = IORegistryEntryCreateCFProperty(platformExpert,
																 CFSTR(kIOPlatformSerialNumberKey),
																 kCFAllocatorDefault, 0);
		IOObjectRelease(platformExpert);
	}

	NSString *serialNumber = @"V9ZXKLPWAV7C4ED7"; /* dummy serialNumber */
	if (serialNumberAsCFString) {
		serialNumber = [NSString stringWithString:(__bridge NSString *)serialNumberAsCFString];
		CFRelease(serialNumberAsCFString);
	}

	NSString *serialNumberWithUID = [NSString stringWithFormat:@"%@%X", serialNumber, getuid()];

	unsigned char md5Buffer[CC_MD5_DIGEST_LENGTH];
	NSData *data = [serialNumberWithUID dataUsingEncoding:NSASCIIStringEncoding];
	CC_MD5([data bytes], (int)[data length], md5Buffer);
	return [NSData dataWithBytes:md5Buffer length:CC_MD5_DIGEST_LENGTH];
}
#endif

@end

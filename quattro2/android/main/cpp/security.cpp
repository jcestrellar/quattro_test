/*
 * @(#)security.cpp
 *
 * Copyright 2019 Roland Corporation, Japan. All rights reserved.
 */

#include <jni.h>
#include <unistd.h>
#include <cstdlib>
#include <cstring>
#include "security.h"
#include <android/log.h>

extern "C" {
#include "sha1.h"
}

#define OBFUSCATED(string) \
	do { \
		char dump[1024]; \
		const char *p = #string; \
		int len = strlen(p) + 1; \
		uint8_t buf[128] = { 0 }; \
		memcpy(buf, p, len); \
		int size = (len + 3) & ~0x3; \
		scramble(buf, size); \
		for (int i = 0, pos = 0; i < size; i++) { \
			pos += sprintf(dump + pos, "%s0x%02x", (pos ? ", " : ""), buf[i]); \
		} \
		__android_log_print(ANDROID_LOG_VERBOSE, "OBFUSCATED", "uint8_t %s[] = { %s };", p, dump); \
	} while (0);

#define _S(x) scramble(x, sizeof(x))
#define _W(x) memset(x, 0, sizeof(x))

static char *scramble(uint8_t *data, int size)
{
	uint32_t coef1, COEF[] = { 0x028178c1, 0x47d34828, 0xae8ffcb0, 0xa8b75778, 0x83d326e0 };
	uint8_t *start = data, *end = data + size;
	for (int step = 0; data < end; step++) {
		if ((step & 3) == 0) { coef1 = COEF[0]; }
		coef1 *= 3;
		try {
			throw (uint32_t)(coef1 + COEF[(step & 3) + 1]);
		} catch (uint32_t coef2) {
			uint32_t v = 0;
			for (int i = 0; i < 4; i++) {
				v <<= 8; v |= *data++;
			}
			v *= coef1; v = (v >> 16) | (v << 16); v *= coef2;
			uint8_t *p = data - 1;
			for (int i = 0; i < 4; i++) {
				*p-- = (uint8_t)(v); v >>= 8;
			}
		}
	}
	return (char *)start;
}

static bool verifyApplication(JNIEnv *env, jobject context)
{
	if (context == nullptr) return false;

	uint8_t _getPackageManager[] = {
			// OBFUSCATED( getPackageManager )
			0x91, 0x01, 0xb0, 0xd2, 0x3c, 0xd0, 0x67, 0x15, 0x45, 0x02, 0xa4, 0x14, 0xb9, 0x7c, 0x36, 0x32,
			0x4f, 0x25, 0x72, 0x00
	};
	uint8_t _getPackageManager_sig[] = {
			// OBFUSCATED( ()Landroid/content/pm/PackageManager; )
			0x76, 0xc5, 0x1d, 0x11, 0xe9, 0x04, 0x0c, 0x7f, 0x0b, 0xae, 0x2c, 0x5a, 0xaa, 0x4f, 0xe1, 0xd1,
			0x57, 0xcd, 0x70, 0x44, 0x31, 0xae, 0x45, 0xba, 0xa2, 0xc9, 0x8a, 0xec, 0xd3, 0x08, 0x61, 0x61,
			0x0f, 0x12, 0x48, 0x48, 0x7a, 0x48, 0x3b, 0x00
	};
	uint8_t _getPackageName[] = {
			// OBFUSCATED( getPackageName )
			0x91, 0x01, 0xb0, 0xd2, 0x3c, 0xd0, 0x67, 0x15, 0xce, 0x22, 0xeb, 0xdb, 0x7c, 0xe0, 0x6d, 0x65
	};
	uint8_t _getPackageName_sig[] = {
			// OBFUSCATED( ()Ljava/lang/String; )
			0x2c, 0xb5, 0x81, 0xde, 0xe8, 0xfc, 0x88, 0x6e, 0x9f, 0xd4, 0x86, 0x92, 0x2a, 0x86, 0x0f, 0x64,
			0x11, 0xda, 0x56, 0x45, 0x00, 0x00, 0x00, 0x00
	};
	uint8_t _getPackageInfo[] = {
			// OBFUSCATED( getPackageInfo )
			0x91, 0x01, 0xb0, 0xd2, 0x3c, 0xd0, 0x67, 0x15, 0x3b, 0xc3, 0x76, 0x3d, 0x54, 0xec, 0x66, 0x6f
	};
	uint8_t _getPackageInfo_sig[] = {
			// OBFUSCATED( (Ljava/lang/String;I)Landroid/content/pm/PackageInfo; )
			0x02, 0x38, 0x21, 0xb0, 0xe3, 0xeb, 0x15, 0x16, 0x84, 0x28, 0x0f, 0x6a, 0x20, 0xf6, 0x80, 0x1a,
			0x29, 0x56, 0xf9, 0xbc, 0x8d, 0x34, 0xc9, 0x6f, 0x75, 0x2f, 0x29, 0x87, 0xd5, 0x84, 0x5f, 0x94,
			0x9f, 0x5d, 0xf2, 0x3a, 0x89, 0x45, 0x33, 0x72, 0x4d, 0xeb, 0x7c, 0xc4, 0x69, 0x2b, 0x33, 0x32,
			0xaf, 0x18, 0xc5, 0xae, 0x7a, 0x48, 0x3b, 0x00
	};
	uint8_t _signingInfo[] = {
			// OBFUSCATED( signingInfo )
			0x13, 0x30, 0x0f, 0xcb, 0x05, 0xda, 0x6f, 0x2f, 0x74, 0x5d, 0xfa, 0x57
	};
	uint8_t _signingInfo_sig[] = {
			// OBFUSCATED( Landroid/content/pm/SigningInfo; )
			0xd0, 0x81, 0xa0, 0x57, 0xdb, 0xab, 0x9a, 0xfb, 0xcb, 0x02, 0x09, 0xfd, 0x40, 0x83, 0xb4, 0x26, 0x30,
			0xce, 0x3c, 0xca, 0x30, 0xde, 0x2b, 0x44, 0xb6, 0xf2, 0x96, 0xd5, 0xd5, 0x80, 0x29, 0xb1, 0x00, 0x00,
			0x00, 0x00
	};
	uint8_t _getApkContentsSigners[] = {
			// OBFUSCATED( getApkContentsSigners )
			0xc4, 0xd9, 0xab, 0xbc, 0xf5, 0x3e, 0x33, 0xb7, 0x63, 0xe4, 0xf2, 0x3a, 0x81, 0x08, 0x7c, 0x7c,
			0xd3, 0xf3, 0x4e, 0x4f, 0x90, 0x6c, 0x73, 0x00
	};
	uint8_t _getApkContentsSigners_sig[] = {
			// OBFUSCATED( ()[Landroid/content/pm/Signature; )
			0xad, 0xa2, 0xf9, 0xf0, 0x34, 0x6b, 0x77, 0x7a, 0xc4, 0x39, 0x6d, 0xb6, 0xb7, 0x81, 0xa3, 0x30,
			0x6e, 0x18, 0x7b, 0x55, 0xa7, 0xd4, 0xcb, 0x2f, 0x0f, 0x38, 0x46, 0x6e, 0x9e, 0xf0, 0xc7, 0x0e,
			0xb5, 0xc1, 0x3b, 0x00
	};
	uint8_t _toByteArray[] = {
			// OBFUSCATED( toByteArray )
			0xb3, 0x83, 0xf3, 0x58, 0x3e, 0x47, 0x5a, 0x8b, 0xd8, 0xb0, 0x55, 0x26
	};
	uint8_t _toByteArray_sig[] = {
			// OBFUSCATED( ()[B )
			0x59, 0x40, 0xf6, 0x8c, 0x00, 0x00, 0x00, 0x00
	};

	// PackageManager packageManager = context.getPackageManager();
	jclass Context = env->GetObjectClass(context);
	jmethodID getPackageManager = env->GetMethodID(Context, _S(_getPackageManager), _S(_getPackageManager_sig)); _W(_getPackageManager); _W(_getPackageManager_sig);
	jobject packageManager = env->CallObjectMethod(context, getPackageManager);

	// String packageName = context.getPackageName();
	jmethodID getPackageName = env->GetMethodID(Context, _S(_getPackageName), _S(_getPackageName_sig)); _W(_getPackageName); _W(_getPackageName_sig);
	jobject packageName = env->CallObjectMethod(context, getPackageName);

	// PackageInfo packageInfo = packageManager->getPackageInfo(packageName, GET_SIGNING_CERTIFICATES);
	jclass PackageManager = env->GetObjectClass(packageManager);
	jmethodID getPackageInfo = env->GetMethodID(PackageManager, _S(_getPackageInfo), _S(_getPackageInfo_sig)); _W(_getPackageInfo); _W(_getPackageInfo_sig);
	jint GET_SIGNING_CERTIFICATES = 0x08000000;
	jobject packageInfo = env->CallObjectMethod(packageManager, getPackageInfo, packageName, GET_SIGNING_CERTIFICATES);

	// SigningInfo signingInfo = PackageInfo.signingInfo;
	jclass PackageInfo = env->GetObjectClass(packageInfo);
	jfieldID filedId = env->GetFieldID(PackageInfo, _S(_signingInfo), _S(_signingInfo_sig)); _W(_signingInfo); _W(_signingInfo_sig);
	jobject signingInfo = env->GetObjectField(packageInfo, filedId);

	// Signature[] signatures = signingInfo.getApkContentsSigners();
	jclass SigningInfo = env->GetObjectClass(signingInfo);
	jmethodID getApkContentsSigners = env->GetMethodID(SigningInfo, _S(_getApkContentsSigners), _S(_getApkContentsSigners_sig)); _W(_getApkContentsSigners); _W(_getApkContentsSigners_sig);
	jobject signatures = env->CallObjectMethod(signingInfo, getApkContentsSigners);
	if (signatures == nullptr) return false;

	char *s_toByteArray = _S(_toByteArray);
	char *s_toByteArray_sig = _S(_toByteArray_sig);

	unsigned char cert[APK_CERT_SHA1_LEN];
	DESCRUMBLE_KEY(cert, APK_CERT_SHA1);

	jsize length = env->GetArrayLength((jarray)signatures);
	for (jsize i = 0; i < length; i++) {
		// Signature signature = signatures[i];
		jobject signature = env->GetObjectArrayElement((jobjectArray)signatures, i);
		// byte[] bytes = signatures->toByteArray();
		jclass Signature = env->GetObjectClass(signature);
		jmethodID toByteArray = env->GetMethodID(Signature, s_toByteArray, s_toByteArray_sig);
		jbyteArray bytes = (jbyteArray)env->CallObjectMethod(signature, toByteArray);

		// SHA1(bytes) -> digest[]
		jbyte *ptr = env->GetByteArrayElements(bytes, 0);
		uint8_t digest[SHA1_DIGEST_LENGTH];
		memset(digest, 0, sizeof(digest));
		SHA1_CTX sha1;
		SHA1Init(&sha1);
		SHA1Update(&sha1, (uint8_t *)ptr, (unsigned int)env->GetArrayLength(bytes));
		SHA1Final(digest, &sha1);
		env->ReleaseByteArrayElements(bytes, ptr, 0);
#ifdef CHECK_SIGNATURE
		if (!memcmp(cert, digest, sizeof(digest)))
#endif
        {
            _W(cert); _W(_toByteArray); _W(_toByteArray_sig);
            throw true;
        }
	}

    _W(cert); _W(_toByteArray); _W(_toByteArray_sig);
	return false;
}

jbyteArray getAppCryptoSeed(JNIEnv *env, jobject context)
{
	const int len = APP_CRYPTO_SEED_LEN;
	unsigned char seed[len] = { 0 };

#ifdef NDEBUG
	uint8_t _android_os_Debug[] = {
			// OBFUSCATED( android/os/Debug )
			0x6f, 0x4e, 0x3c, 0x01, 0xc4, 0x39, 0x6d, 0xb6, 0x6e, 0xf3, 0x9d, 0x79, 0x61, 0x83, 0x82, 0xa9,
			0x00, 0x00, 0x00, 0x00
	};
	uint8_t _isDebuggerConnected[] = {
			// OBFUSCATED( isDebuggerConnected )
			0xba, 0x72, 0xfa, 0x30, 0x09, 0x52, 0xe9, 0x54, 0xa4, 0xa9, 0x50, 0x64, 0xdc, 0xd4, 0x57, 0x67,
			0x6d, 0x41, 0x61, 0xbb
	};
	uint8_t _isDebuggerConnected_sig[] = {
			// OBFUSCATED( ()Z )
			0x98, 0x81, 0x83, 0x32
	};
	// if (!android.os.Debug.isDebuggerConnected()) { ... }
	jclass Debug = env->FindClass(_S(_android_os_Debug)); _W(_android_os_Debug);
	jmethodID isDebuggerConnected = env->GetStaticMethodID(Debug, _S(_isDebuggerConnected) ,_S(_isDebuggerConnected_sig)); _W(_isDebuggerConnected); _W(_isDebuggerConnected_sig);
	if (!env->CallStaticBooleanMethod(Debug, isDebuggerConnected)) {
		uint8_t _proc_status[] = {
				// OBFUSCATED( /proc/%d/status )
				0x39, 0xfd, 0x56, 0x99, 0x73, 0x4d, 0xf6, 0xf6, 0x1c, 0xa1, 0x6b, 0xd8, 0xf1, 0xe1, 0x9b, 0xeb
		};
		uint8_t _TracerPid[] = {
				// OBFUSCATED( TracerPid )
				0x20, 0x68, 0x52, 0x9a, 0xd1, 0xaf, 0xf2, 0x17, 0xfe, 0xd7, 0x64, 0x00
		};
		char path[64] = { 0 };
		sprintf(path, _S(_proc_status), getpid()); _W(_proc_status);
		FILE *fd = fopen(path, "r"); _W(path);
		if (fd) {
			char buf[256];
			const char *token = _S(_TracerPid);
			while (fgets(buf, sizeof(buf), fd)) {
				if (strncmp(buf, token, 9) == 0) {
					if (atoi(&buf[10]) == 0) {
#endif /* NDEBUG */
						try {
                            verifyApplication(env, context);
						} catch (char c) { /* dummy code */
							for (int i = 0; i < len; i++) { seed[i] ^= (unsigned char)((i << 1) * 3); }
						} catch (bool b) {
							if (b) { DESCRUMBLE_KEY(seed, APP_CRYPTO_SEED); }
						} catch (int n) { /* dummy code */
							SHA1_CTX sha1; SHA1Init(&sha1); SHA1Update(&sha1, seed, len); SHA1Final(seed, &sha1);
						}
#ifdef NDEBUG
					}
                    break;
				}
			}
			fclose(fd);
		}
	}
#endif

	jbyteArray ret = env->NewByteArray(len);
	env->SetByteArrayRegion(ret, 0, len, (jbyte *)seed);
	return ret;
}

extern "C"
void getLibTGContext(unsigned char *buf)
{
    DESCRUMBLE_KEY(buf, LIBTG_ACTIVATION_KEY);
}

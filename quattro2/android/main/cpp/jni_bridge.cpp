//
//  jni_bridge.cpp
//
//  Copyright 2019 Roland Corporation. All rights reserved.
//

#include <jni.h>

extern jbyteArray getAppCryptoSeed(JNIEnv *env, jobject context);

extern "C" {

JNIEXPORT jbyteArray JNICALL
Java_quattro_Security_SecuritySettings_native_1getAppCryptoSeed(
        JNIEnv *env,
        jclass /*unused*/,
        jobject context) {

    return getAppCryptoSeed(env, context);
}

} /* extern "C" */

/*
 * @(#)Crypto.h
 *
 * Copyright 2018 Roland Corporation, Japan. All rights reserved.
 */

#ifndef __CRYPTO_H__
#define __CRYPTO_H__

#include <windows.h>
#include <wincrypt.h>
#include <atlstr.h>

#define MD5_LENGTH			(16)

class Crypto
{
  public:
	Crypto() : hProv(NULL), hHash(NULL), hKey(NULL) {}
	~Crypto();

	bool MD5(CString path, BYTE* buf);
	bool MD5(DATA_BLOB* in, BYTE* buf);

	bool encrypt(ALG_ID alg, DWORD mode, DATA_BLOB* key, DATA_BLOB* iv, DATA_BLOB* in, DATA_BLOB* out);
	bool decrypt(ALG_ID alg, DWORD mode, DATA_BLOB* key, DATA_BLOB* iv, DATA_BLOB* in, DATA_BLOB* out);

	static CStringW uuidgen();

  private:
	HCRYPTPROV hProv;
	HCRYPTHASH hHash;
	HCRYPTKEY  hKey;

	bool prepare(ALG_ID alg, DWORD mode, DATA_BLOB* key, DATA_BLOB* iv);
};

#endif /* __CRYPTO_H__ */

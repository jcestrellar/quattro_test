/*
 * @(#)Crypto.cpp
 *
 * Copyright 2018 Roland Corporation, Japan. All rights reserved.
 */

#include "Crypto.h"
#include <security.h>

#define KEYSIZE_AES_128		(16)
#define KEYSIZE_3DES		(24)

#define BUFSIZE 64

typedef struct KEY_BLOB {
	BLOBHEADER hdr;
	DWORD keySize;
	BYTE bytes[BUFSIZE];
} KEY_BLOB;

Crypto::~Crypto()
{
	if (hProv) ::CryptReleaseContext(hProv, 0);
	if (hHash) ::CryptDestroyHash(hHash);
	if (hKey)  ::CryptDestroyKey(hKey);
}

bool Crypto::MD5(CString path, BYTE* out)
{
	bool success = false;

	HANDLE file = ::CreateFile(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
	if (file != INVALID_HANDLE_VALUE) {
		DATA_BLOB in;
		in.cbData = ::GetFileSize(file, NULL);
		in.pbData = new BYTE[in.cbData];
		DWORD bytes;
		if (in.pbData && ::ReadFile(file, in.pbData, in.cbData, &bytes, NULL)) {
			in.cbData = bytes;
			success = MD5(&in, out);
		}
		delete [] in.pbData;
		::CloseHandle(file);
	}

	return success;
}

bool Crypto::MD5(DATA_BLOB* in, BYTE* out)
{
	if (!::CryptAcquireContext(&hProv, NULL, MS_ENH_RSA_AES_PROV, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) return false;
	if (!::CryptCreateHash(hProv, CALG_MD5, 0, 0, &hHash)) return false;
	if (!::CryptHashData(hHash, in->pbData, in->cbData, 0)) return false;
    DWORD size = MD5_LENGTH;
	if (!::CryptGetHashParam(hHash, HP_HASHVAL, out, &size, 0)) return false;
	return true;
}

bool Crypto::prepare(ALG_ID alg, DWORD mode, DATA_BLOB* key, DATA_BLOB* iv)
{
	DWORD	keySize;
	DWORD	padding	= PKCS5_PADDING;

	switch (alg) {
		case CALG_AES_128:	keySize = KEYSIZE_AES_128; break;
		case CALG_3DES:		keySize = KEYSIZE_3DES;    break;
		default: return false;
	}

	BYTE keyBuffer[BUFSIZE];
	memset(keyBuffer, 0, sizeof(keyBuffer));
	if (key && key->pbData && (key->cbData > 0)) {
		memcpy(keyBuffer, key->pbData, min(key->cbData, BUFSIZE));
	}

	BYTE ivData[BUFSIZE];
	memset(ivData, 0, sizeof(ivData));
	if (iv && iv->pbData && (iv->cbData > 0)) {
		memcpy(ivData, iv->pbData, min(iv->cbData, BUFSIZE));
	}

	if (!::CryptAcquireContext(&hProv, NULL, MS_ENH_RSA_AES_PROV, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) return false;

	KEY_BLOB blob;
	blob.hdr.bType    = PLAINTEXTKEYBLOB;
	blob.hdr.bVersion = CUR_BLOB_VERSION;
	blob.hdr.reserved = 0;
	blob.hdr.aiKeyAlg = alg;
	blob.keySize      = keySize;
	memcpy(blob.bytes, keyBuffer, keySize);
	if (!::CryptImportKey(hProv, (BYTE*)&blob, sizeof(KEY_BLOB), NULL, 0, &hKey)) return false;
	if (!::CryptSetKeyParam(hKey, KP_MODE, (BYTE*)&mode, 0)) return false;
	if (!::CryptSetKeyParam(hKey, KP_PADDING, (BYTE*)&padding, 0)) return false;
	if (!::CryptSetKeyParam(hKey, KP_IV, ivData, 0)) return false;

	return true;
}

bool Crypto::encrypt(ALG_ID alg, DWORD mode, DATA_BLOB* key, DATA_BLOB* iv, DATA_BLOB* in, DATA_BLOB* out)
{
	if (!in || !out || !in->pbData || !in->cbData) return false;

	if (!prepare(alg, mode, key, iv)) return false;

	out->pbData = 0;
	out->cbData = 0;

	int datalen = in->cbData + BUFSIZE;
	BYTE* data = (BYTE*)::LocalAlloc(LPTR, datalen);
	if (data) {
		memset(data, 0, datalen);
		memcpy(data, in->pbData, in->cbData);
		DWORD size = in->cbData;
		if (::CryptEncrypt(hKey, 0, TRUE, 0, data, &size, datalen)) {
			out->pbData = data;
			out->cbData = size;
			return true;
		} else {
			::LocalFree(data);
		}
	}
	return false;
}

bool Crypto::decrypt(ALG_ID alg, DWORD mode, DATA_BLOB* key, DATA_BLOB* iv, DATA_BLOB* in, DATA_BLOB* out)
{
	if (!in || !out || !in->pbData || !in->cbData) return false;

	if (!prepare(alg, mode, key, iv)) return false;

	out->pbData = 0;
	out->cbData = 0;

	int datalen = in->cbData + BUFSIZE;
	BYTE* data = (BYTE*)::LocalAlloc(LPTR, datalen);
	if (data) {
		memset(data, 0, datalen);
		memcpy(data, in->pbData, in->cbData);
		DWORD size = in->cbData;
		if (::CryptDecrypt(hKey, 0, TRUE, 0, data, &size)) {
			out->pbData = data;
			out->cbData = size;
			return true;
		} else {
			::LocalFree(data);
		}
	}
	return false;
}

CStringW Crypto::uuidgen()
{
	CStringW ret = L"00000000-0000-0000-0000-000000000000";
	UUID uuid;
	if (::UuidCreate(&uuid) == RPC_S_OK) {
		RPC_WSTR lpszUuid = NULL;
		if (::UuidToString(&uuid, &lpszUuid) == RPC_S_OK) {
			ret = LPCWSTR(lpszUuid);
			::RpcStringFree(&lpszUuid);
		}
	}
	return ret;
}

//
//  NativeCall+security.cpp
//
//  Copyright 2018 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"
#include <rpc.h>
#include <wincrypt.h>
#include "../Common/Crypto.h"
#include <security.h>

static LPCWSTR OBJ_NAME = L"security";

enum {
	dispid_security_kiv,
	dispid_security_uuidgen,
	dispid_security_md5,
	dispid_security_encipher,
	dispid_security_decipher,
	dispid_security_aesencrypt,
	dispid_security_aesdecrypt,
	dispid_security_desencrypt,
	dispid_security_desdecrypt,
};

NativeCall_security::NativeCall_security(NativeObjects* objs) : NativeCall(objs)
{
	set(L"kiv",        dispid_security_kiv);
	set(L"uuidgen",    dispid_security_uuidgen);
	set(L"md5",        dispid_security_md5);
	set(L"encipher",   dispid_security_encipher);
	set(L"decipher",   dispid_security_decipher);
	set(L"aesencrypt", dispid_security_aesencrypt);
	set(L"aesdecrypt", dispid_security_aesdecrypt);
	set(L"desencrypt", dispid_security_desencrypt);
	set(L"desdecrypt", dispid_security_desdecrypt);
}

LPCWSTR NativeCall_security::InterfaceName() const { return OBJ_NAME; }

static std::string derivateKey(std::string* salt)
{
	BYTE password[APP_CRYPTO_SEED_LEN];
	DESCRUMBLE_KEY(password, APP_CRYPTO_SEED);
	int seedlen = (int)strlen((char*)password);

	BYTE buf[(MD5_LENGTH * 2) + APP_CRYPTO_SEED_LEN + 8];
	memset(buf, 0, sizeof(buf));
	BYTE* seed = buf + (MD5_LENGTH * 2);
	BYTE* key  = buf + (MD5_LENGTH);
	BYTE* iv   = buf;

	memcpy(seed, password, seedlen);
	if (salt) {
		int saltlen = (int)min(salt->length(), 8);
		memcpy(seed + seedlen, salt->c_str(), saltlen);
		seedlen += 8;
	}

	Crypto crypto;
	DATA_BLOB blobIn;
	blobIn.pbData = seed;
	blobIn.cbData = seedlen;
	if (!crypto.MD5(&blobIn, key)) return "";
	blobIn.pbData = key;
	blobIn.cbData = MD5_LENGTH + seedlen;
	if (!crypto.MD5(&blobIn, iv)) return "";

	std::string kiv((char*)buf, MD5_LENGTH * 2);
	return kiv;
}

void NativeCall_security::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	switch (dispid) {
		case dispid_security_kiv:
		{
			CStringW str(args[0]->GetStringValue().c_str());
			std::string salt = HEX::data(str);
			std::string kiv = derivateKey(&salt);
			CStringW key = HEX::text((BYTE*)kiv.c_str() + MD5_LENGTH, MD5_LENGTH);
			CStringW iv  = HEX::text((BYTE*)kiv.c_str(),  MD5_LENGTH);
			ret = key + "/" + iv;
			break;
		}
		case dispid_security_uuidgen:
		{
			ret = Crypto::uuidgen().MakeUpper();
			break;
		}
		case dispid_security_md5:
		{
			CStringW str(args[0]->GetStringValue().c_str());

			Crypto crypto;
			BYTE md5[MD5_LENGTH];
			bool success = false;

			if (str.Find(L"/") > 0 || str.Find(L"\\") > 0) {
				/* from file */
				success = crypto.MD5(CString(str), md5);
			} else {
				/* from data */
				std::string data;
				data = HEX::data(str);
				DATA_BLOB blobIn;
				blobIn.pbData = (BYTE*)data.c_str();
				blobIn.cbData = (DWORD)data.length();
				success = crypto.MD5(&blobIn, md5);
			}
			ret = success ? HEX::text(md5, MD5_LENGTH) : L"";
			break;
		}
		case dispid_security_encipher:
		{
			CStringW str(args[0]->GetStringValue().c_str());
			CStringA text = UTF::UTF16toUTF8(str);

			std::string kiv = derivateKey(0);

			DATA_BLOB blobIn;
			DATA_BLOB blobOut;
			DATA_BLOB blobEntropy;

			blobIn.pbData = (BYTE*)(LPCSTR(text));
			blobIn.cbData = (DWORD)strlen(text);
			blobEntropy.pbData = (BYTE*)kiv.c_str();
			blobEntropy.cbData = (DWORD)kiv.length();

			if (::CryptProtectData(&blobIn, NULL, &blobEntropy, NULL, NULL,
					CRYPTPROTECT_AUDIT | CRYPTPROTECT_UI_FORBIDDEN, &blobOut)) {
				ret = HEX::text(blobOut.pbData, blobOut.cbData);
				::LocalFree(blobOut.pbData);
			} else {
				ret = L"";
			}
			break;
		}
		case dispid_security_decipher:
		{
			CStringW str(args[0]->GetStringValue().c_str());
			std::string data;
			data = HEX::data(str);

			std::string kiv = derivateKey(0);

			DATA_BLOB blobIn;
			DATA_BLOB blobOut;
			DATA_BLOB blobEntropy;

			blobIn.pbData = (BYTE*)data.c_str();
			blobIn.cbData = (DWORD)data.length();
			blobEntropy.pbData = (BYTE*)kiv.c_str();
			blobEntropy.cbData = (DWORD)kiv.length();

			if (::CryptUnprotectData(&blobIn, NULL, &blobEntropy, NULL, NULL,
					CRYPTPROTECT_UI_FORBIDDEN, &blobOut)) {
				BYTE* text = new BYTE[blobOut.cbData + 1];
				memcpy(text, blobOut.pbData, blobOut.cbData);
				::LocalFree(blobOut.pbData);
				text[blobOut.cbData]= '\0';
				ret = UTF::UTF8toUTF16(CStringA(text));
			} else {
				ret = L"";
			}
			break;
		}
		case dispid_security_aesencrypt:
		case dispid_security_aesdecrypt:
		case dispid_security_desencrypt:
		case dispid_security_desdecrypt:
		{
			CStringW kiv;
			if (args.size() > 1) {
				kiv = args[1]->GetStringValue().c_str();
			} else {
				std::string _kiv = derivateKey(0);
				CStringW key = HEX::text((BYTE*)_kiv.c_str() + MD5_LENGTH, MD5_LENGTH);
				CStringW iv  = HEX::text((BYTE*)_kiv.c_str(),  MD5_LENGTH);
				kiv = key + "/" + iv;
			}

			std::string key, iv;
			int pos = kiv.Find(L"/");
			if (pos < 0) {
				key = HEX::data(kiv);
			} else {
				key = HEX::data(kiv.Left(pos));
				iv  = HEX::data(kiv.Mid(pos + 1));
			}

			DATA_BLOB blobKey, blobIV;
			blobKey.pbData = (BYTE*)key.c_str();
			blobKey.cbData = (DWORD)key.length();
			blobIV.pbData  = (BYTE*)iv.c_str();
			blobIV.cbData  = (DWORD)iv.length();

			DATA_BLOB blobIn, blobOut = { 0 };
			CStringW str(args[0]->GetStringValue().c_str());
			std::string data;
			data = HEX::data(str);
			blobIn.pbData = (BYTE*)data.c_str();
			blobIn.cbData = (DWORD)data.length();

			ALG_ID alg; DWORD mode; bool enc;
			switch (dispid) {
			case dispid_security_aesencrypt: alg = CALG_AES_128; mode = CRYPT_MODE_CBC; enc = true;  break;
			case dispid_security_aesdecrypt: alg = CALG_AES_128; mode = CRYPT_MODE_CBC; enc = false; break;
			case dispid_security_desencrypt: alg = CALG_3DES; mode = CRYPT_MODE_ECB; enc = true;  break;
			case dispid_security_desdecrypt: alg = CALG_3DES; mode = CRYPT_MODE_ECB; enc = false; break;
			}

			Crypto crypto;
			bool success = enc ?
					crypto.encrypt(alg, mode, &blobKey, &blobIV, &blobIn, &blobOut) :
					crypto.decrypt(alg, mode, &blobKey, &blobIV, &blobIn, &blobOut);
			if (success) {
				ret = HEX::text(blobOut.pbData, blobOut.cbData);
				::LocalFree(blobOut.pbData);
			} else {
				ret = L"";
			}
			break;
		}
	}
}

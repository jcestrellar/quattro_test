//
//	Security.java
//
//	Copyright 2018 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import android.provider.Settings;
import android.webkit.JavascriptInterface;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.UUID;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import quattro.Security.*;

public class Security extends JavaScriptObject {

	private final String interfaceName = "security";

	public static final int MD5_LENGTH = 16;

	public static final int KEY_SIZE_AES128 = 16;
	public static final int KEY_SIZE_3DES = 24;

	public static final int IV_SIZE_AES128 = 16;
	public static final int IV_SIZE_3DES = 8;

	public String getInterfaceName() {
		return interfaceName;
	}

	public Security(JavaScriptHandler h) {
		super(h);
	}

	@Override
	public void onDestroy() {
	}

	private String derivateKey(byte[] salt) {
		byte[] seed = SecuritySettings.APP_CRYPTO_SEED(getApplicationContext());
		int seedlen = 0; while (seed[seedlen] != 0) { seedlen++; }

		byte[] buf = new byte[MD5_LENGTH + seedlen + 8];
		Arrays.fill(buf, (byte)0);
		System.arraycopy(seed, 0, buf, MD5_LENGTH, seedlen);
		if (salt != null) {
			int saltlen = Math.min(salt.length, 8);
			System.arraycopy(salt, 0, buf, MD5_LENGTH + seedlen, saltlen);
			seedlen += 8;
		}

		try {
			MessageDigest md5 = MessageDigest.getInstance("MD5");
			md5.update(buf, MD5_LENGTH, seedlen);
			byte[] key = md5.digest();
			System.arraycopy(key, 0, buf, 0, MD5_LENGTH);
			md5.update(buf, 0, MD5_LENGTH + seedlen);
			byte[] iv = md5.digest();
			return toHexString(key) + "/" + toHexString(iv);
		} catch (NoSuchAlgorithmException e) {
			return "";
		}
	}

	@JavascriptInterface
	public String kiv(String salt) { return derivateKey(toByteArray(salt)); }

	@JavascriptInterface
	public String uuidgen() { return UUID.randomUUID().toString().toUpperCase(); }

	@JavascriptInterface
	public String md5(String data) {
		byte[] bytes = null;
		if (data.contains("/")) {
			/* from file */
			File file = new File(data);
			bytes = new byte[(int)file.length()];
			try {
				BufferedInputStream buf = new BufferedInputStream(new FileInputStream(file));
				buf.read(bytes, 0, bytes.length);
	    		buf.close();
			} catch (IOException e) { return ""; }
		} else {
			/* from data */
			bytes  = toByteArray(data);
		}
		try {
			MessageDigest md5 = MessageDigest.getInstance("MD5");
			return toHexString(md5.digest(bytes));
		} catch (NoSuchAlgorithmException e) {
			return "";
		}
	}

	private byte[] UUID() {
		String id = Settings.Secure.getString(getApplicationContext().getContentResolver(), Settings.Secure.ANDROID_ID);
		try {
			MessageDigest md5 = MessageDigest.getInstance("MD5");
			return md5.digest(id.getBytes());
		} catch (NoSuchAlgorithmException e) {}
		return null;
	}

	@JavascriptInterface
	public String encipher(String text) {
		byte[] uuid = UUID(); if (uuid == null) return "";

		String[] kiv = derivateKey(null).split("/");
		byte[] key = (kiv.length > 0) ? toByteArray(kiv[0]) : null;
		byte[] iv  = (kiv.length > 1) ? toByteArray(kiv[1]) : null;

		byte[] in = text.getBytes();
		byte[] out = null;
		out = crypto("AES", "CBC", Cipher.ENCRYPT_MODE, in, uuid, null);
		if (out != null) {
			out = crypto("AES", "CBC", Cipher.ENCRYPT_MODE, out, key, iv);
			if (out != null) {
				return toHexString(out);
			}
		}
		return "";
	}

	@JavascriptInterface
	public String decipher(String data) {
		byte[] uuid = UUID(); if (uuid == null) return "";

		String[] kiv = derivateKey(null).split("/");
		byte[] key = (kiv.length > 0) ? toByteArray(kiv[0]) : null;
		byte[] iv  = (kiv.length > 1) ? toByteArray(kiv[1]) : null;

		byte[] in  = toByteArray(data);
		byte[] out = crypto("AES", "CBC", Cipher.DECRYPT_MODE, in, key, iv);
		if (out != null) {
			out = crypto("AES", "CBC", Cipher.DECRYPT_MODE, out, uuid, null);
			if (out != null) {
				return new String(out);
			}
		}
		return "";
	}

	@JavascriptInterface
	public String aesencrypt(String data) { return aesencrypt(data, null); }
	@JavascriptInterface
	public String aesencrypt(String data, String opt) {
		byte[] in  = toByteArray(data);
		if (opt == null) {
			opt = derivateKey(null);
		}
		String[] kiv = opt.split("/");
		byte[] key = (kiv.length > 0) ? toByteArray(kiv[0]) : null;
		byte[] iv  = (kiv.length > 1) ? toByteArray(kiv[1]) : null;
		byte[] out = crypto("AES", "CBC", Cipher.ENCRYPT_MODE, in, key, iv);
		return (out != null) ? toHexString(out) : "";
	}

	@JavascriptInterface
	public String aesdecrypt(String data) { return aesdecrypt(data, null); }
	@JavascriptInterface
	public String aesdecrypt(String data, String opt) {
		byte[] in  = toByteArray(data);
		if (opt == null) {
			opt = derivateKey(null);
		}
		String[] kiv = opt.split("/");
		byte[] key = (kiv.length > 0) ? toByteArray(kiv[0]) : null;
		byte[] iv  = (kiv.length > 1) ? toByteArray(kiv[1]) : null;
		byte[] out = crypto("AES", "CBC", Cipher.DECRYPT_MODE, in, key, iv);
		return (out != null) ? toHexString(out) : "";
	}

	@JavascriptInterface
	public String desencrypt(String data) { return desencrypt(data, null); }
	@JavascriptInterface
	public String desencrypt(String data, String opt) {
		byte[] in  = toByteArray(data);
		if (opt == null) {
			opt = derivateKey(null);
		}
		String[] kiv = opt.split("/");
		byte[] key = (kiv.length > 0) ? toByteArray(kiv[0]) : null;
		byte[] iv  = (kiv.length > 1) ? toByteArray(kiv[1]) : null;
		byte[] out = crypto("DESede",  "ECB", Cipher.ENCRYPT_MODE, in, key, iv);
		return (out != null) ? toHexString(out) : "";
	}

	@JavascriptInterface
	public String desdecrypt(String data) { return desdecrypt(data, null); }
	@JavascriptInterface
	public String desdecrypt(String data, String opt) {
		byte[] in  = toByteArray(data);
		if (opt == null) {
			opt = derivateKey(null);
		}
		String[] kiv = opt.split("/");
		byte[] key = (kiv.length > 0) ? toByteArray(kiv[0]) : null;
		byte[] iv  = (kiv.length > 1) ? toByteArray(kiv[1]) : null;
		byte[] out = crypto("DESede", "ECB", Cipher.DECRYPT_MODE, in, key, iv);
		return (out != null) ? toHexString(out) : "";
	}

	private byte[] crypto(String alg, String mode, int op, byte[] data, byte[] key, byte[] iv) {

		int keySize, ivSize;
		if (alg.equals("AES")) {
			keySize = KEY_SIZE_AES128;
			ivSize  = IV_SIZE_AES128;
		} else
		if (alg.equals("DESede")) {
			keySize = KEY_SIZE_3DES;
			ivSize  = IV_SIZE_3DES;
		} else {
			return null;
		}

		byte[] _key = new byte[keySize]; Arrays.fill(_key, (byte)0);
		if (key != null) {
			keySize = Math.min(key.length, keySize);
			for (int i = 0; i < keySize; i++) { _key[i] = key[i]; }
		}

		byte[] _iv  = new byte[ivSize]; Arrays.fill(_iv,  (byte)0);
		if (iv != null) {
			ivSize = Math.min(iv.length, ivSize);
			for (int i = 0; i < ivSize; i++) { _iv[i] = iv[i]; }
		}

		try {
			Cipher cipher = Cipher.getInstance(alg + "/" + mode + "/PKCS5Padding");
			SecretKeySpec keySpec = new SecretKeySpec(_key, alg);
			if (mode == "CBC") {
				IvParameterSpec ivSpec = new IvParameterSpec(_iv);
				cipher.init(op, keySpec, ivSpec);
			} else {
				cipher.init(op, keySpec);
			}
			return cipher.doFinal(data);
		} catch (NoSuchAlgorithmException e) {
		} catch (NoSuchPaddingException e) {
		} catch (InvalidKeyException e) {
		} catch (BadPaddingException e) {
		} catch (InvalidAlgorithmParameterException e) {
		} catch (IllegalBlockSizeException e) {	}
		return null;
	}

}

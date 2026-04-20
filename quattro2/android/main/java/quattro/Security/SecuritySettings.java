package quattro.Security;

import android.content.Context;
import android.content.pm.PackageManager;
import android.content.pm.Signature;

public class SecuritySettings {

	static {
		System.loadLibrary("misc");
	}

	// Native methods
	private static native byte[] native_getAppCryptoSeed(Context context);

	public static byte[] APP_CRYPTO_SEED(Context context) {
		return native_getAppCryptoSeed(context);
	}

}

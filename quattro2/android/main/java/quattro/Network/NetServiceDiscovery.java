//
//	NetServiceDiscovery.java
//
//	Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.Network;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;

import java.util.Iterator;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;

public class NetServiceDiscovery {

	private WifiManager wifiManager = null;
	private WifiManager.MulticastLock multicastLock = null;

	private NsdManager nsdManager = null;

	private NsdManager.DiscoveryListener discoveryListener = null;
	private NsdManager.ResolveListener resolveListener = null;

	private AtomicBoolean resolving = new AtomicBoolean(false);
	private ConcurrentLinkedQueue<NsdServiceInfo> pendingNsdServices = new ConcurrentLinkedQueue<NsdServiceInfo>();

	private NetServiceDiscoveryDelegate delegate = null;

	public NetServiceDiscovery(Context context, NetServiceDiscoveryDelegate delegate) {
		wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
		nsdManager = (NsdManager)context.getApplicationContext().getSystemService(Context.NSD_SERVICE);
		this.delegate = delegate;
	}

	public boolean search(String serviceType) {
		if (discoveryListener != null) {
			return false;
		}

		multicastLock = wifiManager.createMulticastLock("multicastLock");
		if (multicastLock != null) {
			multicastLock.setReferenceCounted(true);
			multicastLock.acquire();
		}

		initializeDiscoveryListener();
		nsdManager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, discoveryListener);
		return true;
	}

	public void stop() {
		if (discoveryListener != null) {
			nsdManager.stopServiceDiscovery(discoveryListener);
			if (multicastLock != null) {
				multicastLock.release();
				multicastLock = null;
			}
		}
	}

	private void initializeDiscoveryListener() {
		discoveryListener = new NsdManager.DiscoveryListener() {
			@Override
			public void onDiscoveryStarted(String regType) {}
			@Override
			public void onStartDiscoveryFailed(String serviceType, int errorCode) { stopped(errorCode); }
			@Override
			public void onDiscoveryStopped(String serviceType) { stopped(0); }
			@Override
			public void onStopDiscoveryFailed(String serviceType, int errorCode) { stopped(errorCode); }

			@Override
			public void onServiceFound(NsdServiceInfo service) {
				if (resolving.compareAndSet(false, true)) {
					nsdManager.resolveService(service, resolveListener);
				} else {
					pendingNsdServices.add(service);
				}
			}

			@Override
			public void onServiceLost(NsdServiceInfo service) {
				Iterator<NsdServiceInfo> iterator = pendingNsdServices.iterator();
				while (iterator.hasNext()) {
					if (iterator.next().getServiceName().equals(service.getServiceName()))
						iterator.remove();
				}
				if (delegate != null) {
					delegate.netServiceDidRemoveService(service.getServiceName());
				}
			}

			private void stopped(int errorCode) {
				discoveryListener = null;
				pendingNsdServices.clear();
				resolving.set(false);
				if (delegate != null) {
					delegate.netServiceDidStopSearch(errorCode);
				}
			}
		};

		initializeResolveListener();
	}

	private void initializeResolveListener() {
		resolveListener = new NsdManager.ResolveListener() {
			@Override
			public void onResolveFailed(NsdServiceInfo service, int errorCode) {
				resolveNextInQueue();
			}

			@Override
			public void onServiceResolved(NsdServiceInfo service) {
				if (delegate != null) {
					delegate.netServiceDidResolve(
							service.getServiceName(),
							service.getHost().getHostAddress(),
							service.getPort());
				}
				resolveNextInQueue();
			}

		};
	}

	private void resolveNextInQueue() {
		NsdServiceInfo service = pendingNsdServices.poll();
		if (service != null) {
			nsdManager.resolveService(service, resolveListener);
		} else {
			resolving.set(false);
		}
	}
}

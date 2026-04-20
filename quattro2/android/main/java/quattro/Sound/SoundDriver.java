//
//    SoundDriver.java
//
//    Copyright 2019 Roland Corporation. All rights reserved.
//

package quattro.Sound;

import quattro.MIDIClient.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;

public class SoundDriver extends Service implements MIDIServer.Driver
{
    static {
        System.loadLibrary("tg");
    }

    // Native methods
    private static native long native_createEngine(Context context);
    private static native void native_deleteEngine(long engineHandle);
    private static native void native_setDefaultSampleRate(int sampleRate);
    private static native void native_setDefaultFramesPerBurst(int framesPerBurst);
    private static native void native_setAudioApi(long engineHandle, int audioApi);
    private static native void native_setAudioDeviceId(long engineHandle, int deviceId);
    private static native void native_setBufferSizeInBursts(long engineHandle, int bufferSizeInBursts);
    private static native int native_getBufferSizeInBursts(long engineHandle);
    private static native boolean native_isLatencyDetectionSupported(long engineHandle);
    private static native double native_getCurrentOutputLatencyMillis(long engineHandle);

    private static native int native_getValue(int pid);
    private static native void native_setValue(int pid, int val);
    private static native void native_processEvents(long engineHandle, byte[] str, long timestamp);

    private static long mEngineHandle = 0;

    private final IBinder binder = new LocalBinder();

    public class LocalBinder extends Binder {
        public SoundDriver getService() {
            return SoundDriver.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) { return binder; }

    @Override
    public void onCreate() {
        super.onCreate();
        if (mEngineHandle == 0) {
            setDefaultStreamValues(this);
            mEngineHandle = native_createEngine(this);
        }
    }

    @Override
    public void onDestroy() {
        if (mEngineHandle != 0) {
            native_deleteEngine(mEngineHandle);
            mEngineHandle = 0;
        }
        super.onDestroy();
    }

    private static void setDefaultStreamValues(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1){
            AudioManager myAudioMgr = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            String sampleRateStr = myAudioMgr.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE);
            int defaultSampleRate = Integer.parseInt(sampleRateStr);
            String framesPerBurstStr = myAudioMgr.getProperty(AudioManager.PROPERTY_OUTPUT_FRAMES_PER_BUFFER);
            int defaultFramesPerBurst = Integer.parseInt(framesPerBurstStr);

            native_setDefaultSampleRate(defaultSampleRate);
            native_setDefaultFramesPerBurst(defaultFramesPerBurst);
        }
    }

    public static void setAudioApi(int audioApi) {
        if (mEngineHandle != 0) native_setAudioApi(mEngineHandle, audioApi);
    }

    public static void setAudioDeviceId(int deviceId) {
        if (mEngineHandle != 0) native_setAudioDeviceId(mEngineHandle, deviceId);
    }

    public static void setBufferSizeInBursts(int bufferSizeInBursts) {
        if (mEngineHandle != 0) native_setBufferSizeInBursts(mEngineHandle, bufferSizeInBursts);
    }

    public static int getBufferSizeInBursts() {
        if (mEngineHandle == 0) return -1;
        return native_getBufferSizeInBursts(mEngineHandle);
    }
    public static boolean isLatencyDetectionSupported() {
        return mEngineHandle != 0 && native_isLatencyDetectionSupported(mEngineHandle);
    }

    public static double getCurrentOutputLatencyMillis() {
        if (mEngineHandle == 0) return 0;
        return native_getCurrentOutputLatencyMillis(mEngineHandle);
    }

    public static void setValue(int pid, int val) {
        if (mEngineHandle != 0) native_setValue(pid, val);
    }

    public static int getValue(int pid) {
        if (mEngineHandle == 0) return 0;
        return native_getValue(pid);
    }

    public static void MIDISend(byte[] data, long timestamp /* nano seconds */) {
        if (mEngineHandle != 0) native_processEvents(mEngineHandle, data, timestamp);
    }

    public static boolean _thru = false;
    public static boolean thru() { return _thru; };
    public static void thru(boolean enable) { _thru = enable; };


    // MIDI Driver Interfaces
    private static final String ENDPOINT_NAME = "TGIF";

    class OutputEndpoint implements MIDIServer.Endpoint {
        @Override
        public void open() {}
        @Override
        public void close() {}
        @Override
        public HashMap<String,Object> getMap() {
            HashMap<String,Object> map = new HashMap<String,Object>();
            map.put(MIDIClient.deviceNameKey,    ENDPOINT_NAME);
            map.put(MIDIClient.entityNameKey,    ENDPOINT_NAME);
            map.put(MIDIClient.endpointUIDKey,   ENDPOINT_NAME);
            map.put(MIDIClient.endpointIndexKey, ENDPOINT_NAME);
            return map;
        }
        @Override
        public void send(byte[] msg) {
            MIDISend(msg, System.nanoTime());
        }
    }

    private final OutputEndpoint endpoint = new OutputEndpoint();

    @Override
    public void start() { }
    @Override
    public void stop() { }

    @Override
    public synchronized ArrayList<HashMap<String, Object>> getOutputEndpointsMap() {
        ArrayList<HashMap<String, Object>> list = new ArrayList<HashMap<String, Object>>();
        list.add(endpoint.getMap());
        return list;
    }

    @Override
    public Set<MIDIServer.Endpoint> getOutputEndpoints() {
        Set<MIDIServer.Endpoint> set = new HashSet<MIDIServer.Endpoint>();
        set.add(endpoint);
        return set;
    }

    @Override
    public MIDIServer.Endpoint findOutputEndpoint(HashMap<String, Object> map) {
        String uid = map.get(MIDIClient.endpointUIDKey).toString();
        if (uid.equals(endpoint.getMap().get(MIDIClient.endpointUIDKey))) {
            return endpoint;
        }
        return null;
    }

    @Override
    public synchronized ArrayList<HashMap<String, Object>> getInputEndpointsMap() {
        return new ArrayList<HashMap<String, Object>>(); /* empty list */
    }
    @Override
    public Set<MIDIServer.Endpoint> getInputEndpoints() {
        return null; /* no input endpoint */
    }
    @Override
    public MIDIServer.Endpoint findInputEndpoint(HashMap<String, Object> map) {
        return null; /* no input endpoint */
    }

}

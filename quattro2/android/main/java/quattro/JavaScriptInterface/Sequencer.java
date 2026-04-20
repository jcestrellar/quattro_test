//
//	Sequencer.java
//
//	Copyright 2025 Roland Corporation. All rights reserved.
//

package quattro.JavaScriptInterface;

import quattro.Sound.*;

import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class Sequencer extends JavaScriptObject {

	private final String interfaceName = "seq";

	public String getInterfaceName() {
		return interfaceName;
	}

	private final int BUILTIN_SOUND  = 0;
	private final int EXTERNAL_MIDI  = 1;
	private final int MIDIIN_MESSAGE = 2;
	private int outputType = BUILTIN_SOUND;

	quattro.MIDIClient.MIDIClient midi = null;

	private class _SequencerDelegate implements SequencerDelegate {
		public void sequencerMIDISend(byte[] data, byte[] metro) {
			if (midi != null) {
				midi.outputPort.send(data);
				return;
			}
			if (outputType == MIDIIN_MESSAGE) {
				postEvent("midi" + "\f" + "message" + "\f" + toHexString(data) + "\f" + (System.nanoTime() / 1000000L));
				return;
			}
			if ((metro != null) && (metro.length > 0)) {
				int len = (data != null) ? data.length : 0;
				byte[] tmp = new byte[metro.length + len];
				System.arraycopy(metro, 0, tmp, 0, metro.length);
				if (len > 0) {
					System.arraycopy(data, 0, tmp, metro.length, len);
				}
				data = tmp;
			}
			if ((data != null) && handler.getMIDIServer().isSoundDriverConnected()) {
				SoundDriver.MIDISend(data, System.nanoTime());
			}
		}
		public void sequencerTempoDidChange(int bpm) {
			postEvent(getInterfaceName() + "\f" + "tempo" + "\f" + bpm);
		}
		public void sequencerDidFinishPlaying() {
			postEvent(getInterfaceName() + "\f" + "stop");
		}
	}

	quattro.Sound.Sequencer seq = null;

	public Sequencer(JavaScriptHandler h) {
		super(h);
		seq = new quattro.Sound.Sequencer();
		seq.delegate = new _SequencerDelegate();
	}

	@JavascriptInterface
	public boolean load(String data) {
		return load(data, false);
	}
	@JavascriptInterface
	public boolean load(String data, boolean cue) {
		return seq.load(toByteArray(data), cue);
	}

	@JavascriptInterface
	public void play() {
		play(false);
	}
	@JavascriptInterface
	public void play(boolean loop) {
		seq.play(loop);
	}

	@JavascriptInterface
	public void pause() {
		seq.stop(false);
	}

	@JavascriptInterface
	public void stop() {
		seq.stop(true);
	}

	@JavascriptInterface
	public void locate(int beats) {
		seq.locate(beats);
	}

	@JavascriptInterface
	public String range(int beatA, int beatB) {
		seq.range(beatA, beatB);
		return range();
	}
	@JavascriptInterface
	public String range() {
		return "[" + seq.beatsA() + "," + seq.beatsB() + "]";
	}

	@JavascriptInterface
	public int tempo(int bpm) {
		seq.tempo(bpm);
		return tempo();
	}
	@JavascriptInterface
	public int tempo() {
		return seq.tempo();
	}

	@JavascriptInterface
	public int mute(int channels) {
		seq.mute(channels);
		return mute();
	}
	@JavascriptInterface
	public int mute() {
		return seq.mute();
	}

	@JavascriptInterface
	public int transpose(int shift) {
		seq.transpose(shift);
		return transpose();
	}
	@JavascriptInterface
	public int transpose() {
		return seq.transpose();
	}

	@JavascriptInterface
	public int countin(int bars) {
		seq.countInBars = bars;
		return countin();
	}
	@JavascriptInterface
	public int countin() {
		return seq.countInBars;
	}

	@JavascriptInterface
	public boolean metro(boolean on) {
		seq.metroSw(on);
		return metro();
	}
	@JavascriptInterface
	public boolean metro() {
		return seq.metroSw();
	}

	private ArrayList<byte[]> toArrayList(String json) {
		ArrayList<byte[]> notes = new ArrayList<byte[]>();
		try {
			JSONArray array = new JSONArray(json);
			for (int i = 0; i < array.length(); i++) {
				String hex = array.getString(i);
				if (hex.length() > 0) {
					notes.add(toByteArray(hex));
				}
			}
		} catch (JSONException e) {}
		return notes;
	}

	@JavascriptInterface
	public void metroset(String json) {
		seq.setMetroNotes(toArrayList(json));
	}

	@JavascriptInterface
	public void countset(String json) {
		seq.setCountNotes(toArrayList(json));
	}

	@JavascriptInterface
	public int position() {
		quattro.Sound.Sequencer.Position p = seq.position();
		return p.beats;
	}

	@JavascriptInterface
	public int totalbeats() {
		return seq.lengthInBeats();
	}

	private String toJSONArray(quattro.Sound.Sequencer.Position p) {
		return "[" + p.beats + "," + p.nn + "," + (1 << p.dd) + "," + p.cc + "," +
			p.bars + "," + p.beatsInBar + "," + ((p.ticksInBeat * 1000) / p.ticksPerBeat) + "," +
			seq.countInState() + "]";
	}

	@JavascriptInterface
	public String measure() {
		return toJSONArray(seq.position());
	}
	@JavascriptInterface
	public String measure(int beats) {
		return toJSONArray(seq.position(beats));
	}

	@JavascriptInterface
	public String info() throws JSONException {
		JSONObject obj = new JSONObject();
		obj.put("title", seq.title());
		obj.put("copyright", seq.copyright());
		return obj.toString();
	}

	@JavascriptInterface
	public void output(int type) {
		outputType = type;
		if (type == EXTERNAL_MIDI) {
			MIDIClient client = (MIDIClient) handler.getObject("midi");
			midi = client.getClient();
		} else {
			midi = null;
		}
	}

	@Override
	public void onDestroy() {
		seq.delegate = null;
		seq.destroy();
		seq = null;
	}
}

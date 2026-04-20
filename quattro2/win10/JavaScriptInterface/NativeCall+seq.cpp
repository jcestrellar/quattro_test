//
//  NativeCall+seq.cpp
//
//  Copyright 2025 Roland Corporation. All rights reserved.
//

#include "NativeCall.h"

static LPCWSTR OBJ_NAME = L"seq";

enum {
	dispid_seq_load,
	dispid_seq_play,
	dispid_seq_pause,
	dispid_seq_stop,
	dispid_seq_locate,
	dispid_seq_range,
	dispid_seq_tempo,
	dispid_seq_mute,
	dispid_seq_transpose,
	dispid_seq_countin,
	dispid_seq_metro,
	dispid_seq_metroset,
	dispid_seq_countset,
	dispid_seq_position,
	dispid_seq_measure,
	dispid_seq_totalbeats,
	dispid_seq_info,
	dispid_seq_output,
};

NativeCall_seq::NativeCall_seq(NativeObjects* objs) : NativeCall(objs)
{
	set(L"load",       dispid_seq_load);
	set(L"play",       dispid_seq_play);
	set(L"pause",      dispid_seq_pause);
	set(L"stop",       dispid_seq_stop);
	set(L"locate",     dispid_seq_locate);
	set(L"range",      dispid_seq_range);
	set(L"tempo",      dispid_seq_tempo);
	set(L"mute",       dispid_seq_mute);
	set(L"transpose",  dispid_seq_transpose);
	set(L"countin",    dispid_seq_countin);
	set(L"metro",      dispid_seq_metro);
	set(L"metroset",   dispid_seq_metroset);
	set(L"countset",   dispid_seq_countset);
	set(L"position",   dispid_seq_position);
	set(L"measure",    dispid_seq_measure);
	set(L"totalbeats", dispid_seq_totalbeats);
	set(L"info",       dispid_seq_info);
	set(L"output",     dispid_seq_output);
}

LPCWSTR NativeCall_seq::InterfaceName() const { return OBJ_NAME; }

void NativeCall_seq::Dispatch(UINT dispid, const CefV8ValueList& args, CefRetValue& ret)
{
	Sequencer* seq = mp_objs->seq;

	switch (dispid) {

		case dispid_seq_load:
		{
			std::string data = HEX::data(args[0]->GetStringValue().c_str());
			bool cue = (args.size() > 1) ? args[1]->GetBoolValue() : false;
			ret = seq->load((BYTE*)data.c_str(), (int)data.length(), cue);
			break;
		}
		case dispid_seq_play:
		{
			bool repeat = (args.size() > 0) ? args[0]->GetBoolValue() : false;
			seq->play(repeat);
			break;
		}
		case dispid_seq_pause:
		{
			seq->stop(false);
			break;
		}
		case dispid_seq_stop:
		{
			seq->stop(true);
			break;
		}
		case dispid_seq_locate:
		{
			seq->locate(args[0]->GetIntValue());
			break;
		}
		case dispid_seq_range:
		{
			if (args.size() > 1) {
				seq->range(args[0]->GetIntValue(), args[1]->GetIntValue());
			}
			CStringW json;
			json.Format(L"[%d,%d]", seq->beatsA(), seq->beatsB());
			ret = json;
			break;
		}
		case dispid_seq_tempo:
		{
			if (args.size() > 0) {
				seq->tempo(args[0]->GetIntValue());
			}
			ret = seq->tempo();
			break;
		}
		case dispid_seq_mute:
		{
			if (args.size() > 0) {
				seq->mute(args[0]->GetIntValue());
			}
			ret = seq->mute();
			break;
		}
		case dispid_seq_transpose:
		{
			if (args.size() > 0) {
				seq->transpose(args[0]->GetIntValue());
			}
			ret = seq->transpose();
			break;
		}
		case dispid_seq_countin:
		{
			if (args.size() > 0) {
				seq->countInBars(args[0]->GetIntValue());
			}
			ret = seq->countInBars();
			break;
		}
		case dispid_seq_metro:
		{
			if (args.size() > 0) {
				seq->metroSw(args[0]->GetBoolValue());
			}
			ret = seq->metroSw();
			break;
		}
		case dispid_seq_metroset:
		case dispid_seq_countset:
		{
			std::vector<std::string> notes;
			if (args.size() > 0) {
				picojson::value v;
				picojson::parse(v, LPCWSTR(args[0]->GetStringValue().c_str()));
				picojson::array& a = v.get<picojson::array>();
				for (picojson::array::iterator it = a.begin(); it != a.end(); it++) {
					std::wstring note = it->get<std::wstring>();
					notes.push_back(HEX::data(note.c_str()));
				}
			}
			if (dispid == dispid_seq_metroset) {
				seq->setMetroNotes(notes);
			} else {
				seq->setCountNotes(notes);
			}
			break;
		}
		case dispid_seq_position:
		{
			SEQ_POSITION p = seq->position();
			ret = p.beats;
			break;
		}
		case dispid_seq_measure:
		{
			SEQ_POSITION p = (args.size() > 0) ?
				seq->position(args[0]->GetIntValue()) : seq->position();
			CStringW json;
			json.Format(L"[%d,%d,%d,%d,%d,%d,%d,%d]",
				p.beats, p.nn, (1 << p.dd), p.cc,
				p.bars, p.beatsInBar, ((p.ticksInBeat * 1000) / p.ticksPerBeat),
				seq->countInState());
			ret = json;
			break;
		}
		case dispid_seq_totalbeats:
		{
			ret = seq->lengthInBeats();
			break;
		}
		case dispid_seq_info:
		{
			picojson::object o;
			o[L"title"] = (picojson::value)std::wstring(CStringW(seq->title()));
			o[L"copyright"] = (picojson::value)std::wstring(CStringW(seq->copyright()));
			picojson::value v = picojson::value(o);
			ret = v.serialize().c_str();
			break;
		}
		case dispid_seq_output:
		{
			mp_objs->_seq->output(args[0]->GetIntValue());
			break;
		}

	}
}

void _SequencerDelegate::sequencerMIDISend(const std::string& data, const std::string& metroNote)
{
	if (m_output == EXTERNAL_MIDI) {
		mp_midi->outputPort()->send((BYTE*)data.c_str(), (int)data.length());
		return;
	}
	if (m_output == MIDIIN_MESSAGE) {
		CStringW ev;
		ev.Format(L"%s\f%s\f%s\f%u", L"midi", L"message",
			HEX::text((BYTE*)data.c_str(), (int)data.length()), Timer::currentMSecTimestamp());
		mp_intf->postEvent(ev);
		return;
	}
	std::string msg = metroNote.length() ? (metroNote + data) : data;
	if (msg.length()) {
#ifdef USE_TGIF
		TGIF::MIDISend((BYTE*)msg.c_str(), (int)msg.length(), Timer::currentUSecTimestamp());
#endif
	}
}

void _SequencerDelegate::sequencerDidFinishPlaying()
{
	CStringW ev;
	ev.Format(L"%s\f%s", OBJ_NAME, L"stop");
	mp_intf->postEvent(ev);
}

void _SequencerDelegate::sequencerTempoDidChange(int bpm)
{
	CStringW ev;
	ev.Format(L"%s\f%s\f%d", OBJ_NAME, L"tempo", bpm);
	mp_intf->postEvent(ev);
}

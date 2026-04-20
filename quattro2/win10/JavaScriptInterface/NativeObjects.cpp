/*
 * @(#)NativeObjects.cpp
 *
 * Copyright 2015 Roland Corporation, Japan. All rights reserved.
 */

#include "NativeObjects.h"

NativeObjects::NativeObjects(JavaScriptInterface* intf) : mp_intf(intf)
{
#ifdef USE_TGIF
	TGIF::init();
#endif

	midi        = new MIDIClient();
	seq         = new Sequencer();
	audio       = new AudioDevice();
	player      = new AudioPlayer();
	recorder    = new AudioRecorder();
	discovery   = new RWCDiscovery();
	rwc         = new RWCConnection();
	http        = new HTTPConnection();
	fsevent     = new FSEvent();

	_midi       = new _MIDIClientDelegate(intf);
	_seq        = new _SequencerDelegate(intf, midi);
	_audio      = new _AudioDeviceDelegate(intf);
	_player     = new _AudioPlayerDelegate(intf);
	_recorder   = new _AudioRecorderDelegate(intf);
	_discovery  = new _RWCDiscoveryDelegate(intf);
	_rwc        = new _RWCConnectionDelegate(intf);
	_http       = new _HTTPConnectionDelegate(intf);
	_fsevent    = new _FSEventDelegate(intf);

	midi->delegate(_midi);
	midi->inputPort()->delegate(_midi);
	seq->delegate(_seq);
	audio->delegate(_audio);
	player->delegate(_player);
	recorder->delegate(_recorder);
	discovery->delegate(_discovery);
	rwc->delegate(_rwc);
	rwc->midiService()->delegate(_rwc);
	rwc->outputStream()->delegate(player);
	rwc->inputStream()->delegate(recorder);
	http->delegate(_http);
	fsevent->delegate(_fsevent);

	output = new AudioOutputUnit();
	input  = new AudioInputUnit();
	player->output(output);
	recorder->input(input);
}

NativeObjects::~NativeObjects()
{
	for (std::vector<MIDIClient*>::iterator iter = clients.begin(); iter != clients.end(); iter++) {
		MIDIClient* client = *iter;
		MIDIClientDelegate* delegate = client->delegate();
		client->inputPort()->delegate(0);
		client->delegate(0);
		delete client;
		delete delegate;
	}
	clients.clear();

	for (std::vector<Thread*>::iterator iter = converting.begin(); iter != converting.end(); iter++) {
		Thread* thread = *iter;
		thread->wait();
		delete thread;
	}
	converting.clear();

	for (std::vector<ExtSamplePlayer*>::iterator iter = sampler.begin(); iter != sampler.end(); iter++) {
		ExtSamplePlayer* player = *iter;
		SamplePlayerDelegate* delegate = player->delegate();
		player->delegate(0);
		delete player;
		delete delegate;
	}
	sampler.clear();

	for (std::vector<TCPIPClient*>::iterator iter = connections.begin(); iter != connections.end(); iter++) {
		TCPIPClient* conn = *iter;
		if (conn) {
			TCPIPClientDelegate* delegate = conn->delegate();
			conn->delegate(0);
			conn->close();
			delete delegate;
		}
	}
	connections.clear();

	if (netservice) {
		NetServiceDiscoveryDelegate* delegate = netservice->delegate();
		netservice->delegate(0);
		netservice->stop();
		delete netservice;
		delete delegate;
	}

	delete fsevent;
	delete http;
	delete rwc;
	delete discovery;
	delete recorder;
	delete player;
	delete audio;
	delete seq;
	delete midi;

	delete input;
	delete output;

	delete _midi;
	delete _seq;
	delete _audio;
	delete _player;
	delete _recorder;
	delete _discovery;
	delete _rwc;
	delete _http;
	delete _fsevent;

#ifdef USE_TGIF
	TGIF::exit();
#endif
}

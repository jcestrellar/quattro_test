//
//  ExtSamplePlayer.cpp
//
//  Copyright 2022 Roland Corporation. All rights reserved.
//

#include "ExtSamplePlayer.h"

ExtSamplePlayer::ExtSamplePlayer()
{
}

ExtSamplePlayer::~ExtSamplePlayer()
{
}

void ExtSamplePlayer::init(const WAVEFORMATEX* pwfe)
{
}

void ExtSamplePlayer::term()
{
}

void ExtSamplePlayer::reset()
{
}

int ExtSamplePlayer::render(BYTE* buffer, int length)
{
	return read(buffer, length);
}

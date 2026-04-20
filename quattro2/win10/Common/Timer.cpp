/*
 * @(#)Timer.cpp
 *
 * Copyright 2025 Roland Corporation, Japan. All rights reserved.
 */

#include "Timer.h"

double Timer::currentUSecTimestamp()
{
	static LARGE_INTEGER qpf = {0};
	static LARGE_INTEGER qpc0 = {0};

	if (qpf.QuadPart == 0) {
		::QueryPerformanceFrequency(&qpf);
		::QueryPerformanceCounter(&qpc0);
	}

	LARGE_INTEGER qpc;
	::QueryPerformanceCounter(&qpc);
	return ((qpc.QuadPart - qpc0.QuadPart) / (double)qpf.QuadPart) * 1000000.0;
}

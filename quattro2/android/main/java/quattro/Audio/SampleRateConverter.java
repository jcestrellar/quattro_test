//
//	SampleRateConverter.java
//
//	Copyright 2022 Roland Corporation. All rights reserved.
//

package quattro.Audio;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

public class SampleRateConverter {

	private static final int DATA_LENGTH = 128;
	private static final int DATA_MASK   = (DATA_LENGTH - 1);
	private static final int MAX_COEFS   = 16000;

	private final float m_rate;
	private final int m_over;
	private int m_tapH;
	private int m_phaseInc;
	private int m_phaseD;
	private int m_idxDat;
	private float[] m_coef;
	private float[][] m_data = null;

	private static int GCD(int a, int b) { return (b > 0) ? GCD(b, a % b) : a; }

	SampleRateConverter(int fi, int fo) {
		m_rate = (float)fi / fo;
		m_over = (fi != fo) ? (fo / GCD(fi, fo)) : 0;
		if (m_over > 0) {
			calcKaiser(new FIRParams(fi, fo));
			m_phaseInc = m_over * fi / fo;
			m_phaseD = 0;
			m_idxDat = 0;
		}
	}

	private final class FIRParams {
		int fs;
		double cutoff;
		double atten;
		int taps;
		FIRParams(int fi, int fo) {
			fs = fi;
			cutoff = (Math.min(fi, fo)) * 0.85 / 2.0;
			atten  = 70.0; /* dB */
			taps = (m_rate <= 0.5) ? 32 : 64;
		}
	}

	private void calcKaiser(FIRParams params) {

		m_coef = new float[MAX_COEFS + 1];

		int fs = params.fs * m_over;
		int taps = (params.taps * m_over / 2) * 2;
		if (taps >= (MAX_COEFS * 2)) taps = (MAX_COEFS * 2);

		double atten = params.atten;
		double deltaF = (atten - 7.95) / (14.36 * taps);
		double edgeF = params.cutoff/fs + deltaF/2;

		double alpha;
		if (atten > 50.0) {
			alpha = 0.1102 * (atten - 8.7);
		} else if (atten > 21.0) {
			alpha = 0.5842 * Math.pow((atten - 21.0), 0.4) + 0.07886 * (atten - 21.0);
		} else {
			alpha = 0.0;
		}
		double i0 = modBessel0(alpha);

		double wp = 2.0 * Math.PI * edgeF;
		double coef = wp / Math.PI;
		m_coef[0] = (float)(coef * m_over);

		int nd = taps / 2;
		double dn2 = (nd * nd);
		for (int k = 1; k <= nd; k++) {
			double dk = (double)k;
			double win = modBessel0(alpha * Math.sqrt(1.0 - dk*dk/dn2)) / i0;
			coef = win * Math.sin(wp*dk) / (Math.PI*dk);
			m_coef[k] = (float)(coef * m_over);
		}

		m_tapH = nd / m_over;
	}

	private double modBessel0(double x) {
		double ax, y, ans;
		if ((ax = Math.abs(x)) < 3.75) {
			y = (x / 3.75);
			y *= y;
			ans = (1.0 + y*(3.5156229 + y*(3.0899424 + y*(1.2067492 + y*(0.2659732 + y*(0.360768e-1 + y*0.45813e-2))))));
		} else {
			y = (3.75 / ax);
			ans = (Math.exp(ax) / Math.sqrt(ax)) *
					(0.39894228 + y*(0.1328592e-1 + y*(0.225319e-2 + y*(-0.157565e-2 + y*(0.916281e-2 + y*(-0.2057706e-1 + y*(0.2635537e-1 + y*(-0.1647633e-1 + y*0.392377e-2))))))));
		}
		return ans;
	}

	private void charge(ByteBuffer inputBuffer, int channels) {
		m_idxDat = (m_idxDat + 1) & DATA_MASK;
		for (int ch = 0; ch < channels; ch++) {
			m_data[ch][m_idxDat] = inputBuffer.getFloat();
		}
	}

	private void convert(ByteBuffer outputBuffer, int channels, int phase) {
		float[] v = new float[channels];
		for (int ch = 0; ch < channels; ch++) {
			v[ch] = 0.0f;
		}

		int idxDat = m_idxDat;
		int idxCoef = m_tapH * m_over - phase;
		for (int k = 0; k < m_tapH; k++) {
			float coef = m_coef[idxCoef];
			for (int ch = 0; ch < channels; ch++) {
				v[ch] += coef * m_data[ch][idxDat];
			}
			idxDat = (idxDat - 1) & DATA_MASK;
			idxCoef -= m_over;
		}
		idxCoef = phase;
		for (int k = 0; k < m_tapH; k++) {
			float coef = m_coef[idxCoef];
			for (int ch = 0; ch < channels; ch++) {
				v[ch] += coef * m_data[ch][idxDat];
			}
			idxDat = (idxDat - 1) & DATA_MASK;
			idxCoef += m_over;
		}

		for (int ch = 0; ch < channels; ch++) {
			outputBuffer.putFloat(v[ch]);
		}
	}

	private boolean init = true;
	private boolean eos = false;

	public byte[] convert(byte[] in, int channels) {
		if ((m_over == 0) || eos) {
			return in; /* no need to convert */
		}

		int block = (channels * Float.BYTES);
		if (in == null) {
			eos = true;
			in = new byte[m_tapH * block];
			Arrays.fill(in, (byte)0);
		}

		int frames = in.length / block;
		ByteBuffer inputBuffer = ByteBuffer.wrap(in).order(ByteOrder.nativeOrder());
		if (init) {
			m_data = new float[channels][DATA_LENGTH];
			charge(inputBuffer, channels);
			frames--;
		}

		int estimate = (int)Math.ceil(frames / m_rate) + m_over;
		ByteBuffer outputBuffer = ByteBuffer.allocate(estimate * block).order(ByteOrder.nativeOrder());
		while (true) {
			while (m_phaseD >= m_over) {
				if (frames <= 0) {
					byte[] result = null;
					outputBuffer.flip();
					if (outputBuffer.limit() > 0) {
						int offset = init ? ((m_tapH * m_over / m_phaseInc) * block) : 0;
						int length = outputBuffer.limit() - offset;
						result = new byte[length];
						System.arraycopy(outputBuffer.array(), offset, result, 0, length);
					}
					init = false;
					return result;
				}
				m_phaseD -= m_over;
				charge(inputBuffer, channels);
				frames--;
			}
			convert(outputBuffer, channels, m_phaseD);
			m_phaseD += m_phaseInc;
		}
	}

}

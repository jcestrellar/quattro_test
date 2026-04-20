import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { StageUrls } from '../../functions/webApi/webApi';

export interface UserState {
  idToken: string;
  refreshToken: string;
  accessToken: string;
  processing: boolean;
  errorMessage: string;
}

const initialState: UserState = {
  idToken: '',
  refreshToken: '',
  accessToken: '',
  processing: false,
  errorMessage: '',
};

async function signinApi(
  email: string,
  password: string
): Promise<{ idToken: string; refreshToken: string; accessToken: string }> {
  const url = `${StageUrls.rcpApiEndpoint}/client/${StageUrls.cliendId}/signin`;
  // const url = 'https://test-rcpapi.roland.com/client/2dhaejqvph6m5bi5hu7mse2nu6/signin'
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: 10秒経過しました。')), 10000)
  );

  try {
    const res = await Promise.race([fetchPromise, timeoutPromise]);

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (e: unknown) {
    console.error(`${signinApi.name}: ${e}`);
    throw new Error(
      'ログインに失敗しました。ネットワークの接続状態を確認してください。'
    );
  }
}

/**
 * 現在は createAsyncThunk を使用して非同期処理を行っているが、将来的には Redux-Saga に置き換える予定。
 * 理由:
 * 1. すでに他の部分で Saga を使用しているため、同じパターンで実装することでソースコードの一貫性を保ちたい。
 * 2. フローが将来的に複雑化する可能性があるため、Saga を使用しておくことで、非同期処理を管理しやすくなる。
 */
export const signin = createAsyncThunk<
  { idToken: string; refreshToken: string; accessToken: string },
  { email: string; password: string }
>('signin', async (userData) => {
  const data = await signinApi(userData.email, userData.password);

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    accessToken: data.accessToken,
  };
});

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    signOut: (state) => {
      state.idToken = '';
      state.refreshToken = '';
      state.accessToken = '';
    },
    clearErrorMessage: (state) => {
      state.errorMessage = '';
    },
  },
  selectors: {
    signedInSelector: (state) => state.idToken !== '',
  },
  extraReducers: (builder) => {
    builder
      // fulfilled
      .addCase(signin.fulfilled, (state, action) => {
        state.processing = false;
        state.idToken = action.payload.idToken;
        state.refreshToken = action.payload.refreshToken;
        state.accessToken = action.payload.accessToken;
        state.errorMessage = '';
      })
      // pending
      .addCase(signin.pending, (state) => {
        state.processing = true;
      })
      // reject
      .addCase(signin.rejected, (state, action) => {
        state.processing = false;
        state.idToken = '';
        state.refreshToken = '';
        state.accessToken = '';
        state.errorMessage = action.error.message ?? '';
      })
      .addDefaultCase(() => {});
  },
});

export const { signOut, clearErrorMessage } = userSlice.actions;
export const { signedInSelector } = userSlice.selectors;

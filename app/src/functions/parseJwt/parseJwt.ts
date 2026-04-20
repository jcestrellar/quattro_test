/**
 * JWT のペイロードを解析してオブジェクトとして返す汎用関数
 * @template T 期待するペイロードの型構造
 * @param {string} token - 解析したいJWT文字列
 * @returns {T | null} - ペイロードのJSONオブジェクト。解析失敗時は null を返す
 */
export function decodeJwtPayload<T = unknown>(token: string): T | null {
  const parts = token.split('.');

  if (parts.length !== 3) {
    console.error('無効なJWT形式です: ドットの数が足りません。');
    return null;
  }

  try {
    const base64Url = token.split('.')[1];

    // Base64Url を Base64 に変換
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // デコード処理（マルチバイト文字 / UTF-8 の文字化け対策を含む）
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload) as T;
  } catch (error) {
    console.error('JWTの解析に失敗しました:', error);
    return null;
  }
}

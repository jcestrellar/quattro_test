/**
 * 1byte の数値 (0–255) を 2桁の HEX 文字列に変換
 * @param num 0–255 の整数
 * @returns 2桁の HEX 文字列 (ex: 255 -> "FF")
 */
export const byteToHex2 = (num: number): string =>
  num.toString(16).toUpperCase().padStart(2, '0');

/**
 * 数値 (byte) の配列を連結して HEX 文字列に変換
 * @param nums byte (0–255) の配列
 * @returns HEX 文字列 (ex: [255,255] -> "FFFF")
 */
export const bytesToHex = (nums: number[]): string =>
  nums.map(byteToHex2).join('');

/**
 * 文字列を UTF-8 としてエンコードして、HEX 文字列に変換
 * @param str 任意文字列
 * @returns HEX 文字列
 */
export const stringToHex = (str: string): string =>
  bytesToHex(Array.from(new TextEncoder().encode(str)));

/**
 * HEX 文字列を UTF-8文字列 にデコード
 * NULL文字 ('\0') が含まれている場合は、それ以降を切り捨てる
 * @param hex HEX 文字列
 * @returns デコードされた文字列
 */
export const hexToString = (hex: string): string => {
  const bytes = hexTo8x1(hex);
  const str = new TextDecoder().decode(new Uint8Array(bytes));
  const _0 = str.indexOf('\0');
  return _0 !== -1 ? str.substring(0, _0) : str;
};

/**
 * HEX 文字列を Base64 文字列へ変換
 * @param hex HEX 文字列
 * @returns Base64 文字列
 */
export const hexToBase64 = (hex: string): string =>
  btoa(
    hex
      .match(/.{2}/g)!
      .map((b) => String.fromCharCode(parseInt(b, 16)))
      .join('')
  );

/**
 * リトルエンディアン形式の HEX 文字列を、符号なし 32bit 整数に変換
 * @param hex リトルエンディアンの HEX 文字列
 * @returns unsigned 32bit
 */
export const leHexToNumber = (hex: string): number => {
  let num = 0;
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    num = (num << 8) | parseInt(hex.substr(i, 2), 16);
  }
  return num >>> 0;
};

/**
 * 数値を指定されたバイト長のリトルエンディアン形式の HEX 文字列に変換
 * @param num 数値
 * @param bytes 出力 byte 数
 * @returns リトルエンディアンの HEX 文字列
 */
export const numberToLeHex = (num: number, bytes: number): string => {
  let hex = '';
  while (bytes-- > 0) {
    hex += byteToHex2(num & 0xff);
    num >>= 8;
  }
  return hex;
};

/**
 * HEX 文字列を2桁 (1byte) ごとに分割し、8bit の整数配列に変換
 * @param hex HEX 文字列
 * @returns 8bit (0–255) の整数配列
 */
export const hexTo8x1 = (hex: string): number[] => {
  const nums: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const v = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(v)) break;
    nums.push(v & 0xff);
  }
  return nums;
};

/**
 * HEX 文字列を2桁 (1byte) ごとに分割し、7bit の整数配列に変換 (上位 1bit をマスク)
 * @param hex HEX 文字列
 * @returns 7bit (0–127) の整数配列
 */
export const hexTo7x1 = (hex: string): number[] => {
  const nums: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const v = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(v)) break;
    nums.push(v & 0x7f);
  }
  return nums;
};

/**
 * HEX 文字列を 4bit×2 配列へ変換
 * @param hex HEX 文字列
 * @returns 4 bit (0–15) の配列 (ex: "AF" -> [10, 15])
 */
export const hexTo4x2 = (hex: string): number[] => {
  const nums: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    const b = hex.slice(i, i + 2);
    const x = parseInt(b, 16);
    if (isNaN(x)) break;
    nums.push((x >> 4) & 0xf, x & 0xf);
  }
  return nums;
};

/**
 * 4bit×2 配列を結合し、8bit (1byte) の配列に変換
 * @param x 4bit×2 配列
 * @returns 8bit (1byte) の配列 (ex: [10, 15] -> [175])
 */
export const _4x2ToBytes = (x: number[]): number[] => {
  const nums: number[] = [];
  for (let i = 0; i < x.length; i += 2) {
    nums.push((x[i] << 4) | (x[i + 1] & 0xf));
  }
  return nums;
};

/**
 * 文字列を SHA-256 でハッシュ化し 64 桁の HEX 文字列に変換
 * @param str 任意文字列
 * @returns SHA-256 ハッシュの 64桁の HEX 文字列
 */
export async function sha256Hex(str: string): Promise<string> {
  const data = new TextEncoder().encode(str); // UTF-8
  const digest = await crypto.subtle.digest({ name: 'SHA-256' }, data); // SHA256
  const bytes = new Uint8Array(digest);
  return bytesToHex(Array.from(bytes)); // 64桁 HEX
}

import { PASSWORD_ITERATIONS, type Credential } from "../data/credentials";

// Băm mật khẩu bằng PBKDF2-SHA256 qua Web Crypto (không cần thư viện ngoài).
// Web Crypto chỉ có trong "secure context": https hoặc localhost.

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const fromHex = (hex: string): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

export async function hashPassword(password: string, saltHex: string, iterations = PASSWORD_ITERATIONS): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto không khả dụng (cần https hoặc localhost).");
  const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations }, key, 256);
  return toHex(bits);
}

// So sánh không dừng sớm để không lộ vị trí ký tự khác nhau.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, credential: Credential): Promise<boolean> {
  return safeEqual(await hashPassword(password, credential.salt), credential.hash);
}

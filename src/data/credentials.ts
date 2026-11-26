// ===== M1: "cơ sở dữ liệu" mật khẩu của tài khoản demo =====
// Chỉ lưu muối + băm PBKDF2-SHA256 (100.000 vòng), KHÔNG lưu mật khẩu gốc.
// Mật khẩu demo của mọi tài khoản: 123456 (ghi ở README).
// Đây là xác thực phía trình duyệt, chỉ phục vụ demo: băm nằm trong bundle nên không thay được xác thực thật ở server.

export const PASSWORD_ITERATIONS = 100_000;

export interface Credential {
  salt: string; // hex
  hash: string; // hex, 32 byte
}

// Khoá theo userId của tài khoản (MSSV hoặc mã nhân sự).
export const CREDENTIALS: Record<string, Credential> = {
  "2112345": { salt: "47eafaca2dd8927e5fb6ef99da629dbd", hash: "66b2a4947a912c89a8280cc42c28d208f21a4ffefff3aec38946df424025515a" },
  "2112346": { salt: "929cf4d7dd0bb4263cfb2abd9d2435f1", hash: "94b220df9f7d40b0798edf8a5534ea4905725e86602186689ba0dc8dae0c6cba" },
  "2112347": { salt: "1df1b40bf2583bf4270dadc1828d742f", hash: "72d2c5922c56496ae0744e1927ed1414bb17c551b47721409add26e1fc22c59f" },
  "2112348": { salt: "f3814f97a4498090051cf5f985fe97f3", hash: "31a72964c4c29235eb76fe7471c8a1b1016af2f5607eb21ccfd04491c50df73a" },
  AD001: { salt: "3e36baab91f15b0e0004b78d1490147c", hash: "a4568b66c64cd3a67d12c351e3f843cb2cf49fec5259e2faf2eb9b30a8a84651" },
  OP001: { salt: "dc090f8b91156e73cd3dc154e5ddc447", hash: "376866c5dbf0adbe0db0fbe33941529e72986de8d326853fb4caf2d2fbeabebc" },
  OP002: { salt: "452fff20b9bc7292bee1a5de055e57a1", hash: "22c85ccdf94fddb017a3b6437cc52bbe8d01a363a50c21be7537f89ceba8923f" },
  MG001: { salt: "5ca931292db5de60eacaf65fb659b197", hash: "156b5e77a95a77f7c195ac36787d5873c43fccd5cfd7ca0ab761120b4f0f968b" },
};

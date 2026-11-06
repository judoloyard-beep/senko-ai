
import crypto from "crypto";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { username, password } = req.body || {};

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SECRET;

  if (!adminUser || !adminPass || !secret || secret.length < 32) {
    return res.status(500).json({
      error: "Konfigurasi admin tidak valid"
    });
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length > 100 ||
    password.length > 200
  ) {
    return res.status(400).json({
      error: "Input tidak valid"
    });
  }

  const safeCompare = (a, b) => {
    const x = Buffer.from(a);
    const y = Buffer.from(b);

    return x.length === y.length &&
      crypto.timingSafeEqual(x, y);
  };

  if (
    !safeCompare(username, adminUser) ||
    !safeCompare(password, adminPass)
  ) {
    return res.status(401).json({
      error: "Username atau password salah"
    });
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = Buffer.from(JSON.stringify({
    sub: adminUser,
    iat: now,
    exp: now + 3600,
    nonce: crypto.randomBytes(16).toString("hex")
  })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const token = `${payload}.${signature}`;

  res.setHeader(
    "Set-Cookie",
    `senko_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
  );

  return res.status(200).json({
    success: true,
    message: "Login berhasil"
  });
}

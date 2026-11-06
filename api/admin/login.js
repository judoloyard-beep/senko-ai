import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { username, password } = req.body || {};

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SECRET;

  if (!adminUser || !adminPass || !secret) {
    return res.status(500).json({
      error: "Konfigurasi admin belum lengkap"
    });
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username !== adminUser ||
    password !== adminPass
  ) {
    return res.status(401).json({
      error: "Username atau password salah"
    });
  }

  const token = crypto
    .createHmac("sha256", secret)
    .update(username)
    .digest("hex");

  res.setHeader(
    "Set-Cookie",
    `senko_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
  );

  return res.status(200).json({
    success: true,
    message: "Login berhasil"
  });
}

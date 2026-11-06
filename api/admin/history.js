import crypto from "crypto";

function verifyAdmin(req) {
  const secret = process.env.ADMIN_SECRET;

  if (!secret || secret.length < 32) return false;

  const cookie = (req.headers.cookie || "")
    .split(";")
    .find(item => item.trim().startsWith("senko_admin="));

  if (!cookie) return false;

  const token = cookie.trim().slice("senko_admin=".length);
  if (token.length > 2000) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)) return false;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    const now = Math.floor(Date.now() / 1000);

    return (
      data.sub === process.env.ADMIN_USERNAME &&
      Number.isInteger(data.exp) &&
      Number.isInteger(data.iat) &&
      data.exp > now &&
      data.iat <= now + 60 &&
      data.exp - data.iat === 3600 &&
      typeof data.nonce === "string"
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if (!verifyAdmin(req)) {
    return res.status(401).json({
      error: "Akses ditolak"
    });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({
      error: "Konfigurasi database tidak lengkap"
    });
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/chat_logs?select=id,user_id,user_message,assistant_reply,created_at&order=created_at.desc&limit=50`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Gagal membaca riwayat chat");
    }

    const chats = await response.json();

    return res.status(200).json({
      chats
    });

  } catch (error) {
    console.error("History error:", error.message);

    return res.status(500).json({
      error: "Gagal mengambil riwayat chat"
    });
  }
}

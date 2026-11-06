import crypto from "crypto";

function verifyAdmin(req) {
  const secret = process.env.ADMIN_SECRET;

  if (!secret || secret.length < 32) return false;

  const cookie = (req.headers.cookie || "")
    .split(";")
    .find(item => item.trim().startsWith("senko_admin="));

  if (!cookie) return false;

  const token = cookie.trim().slice("senko_admin=".length);
  const parts = token.split(".");

  if (parts.length !== 2 || token.length > 2000) return false;

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

  if (req.method !== "POST") {
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

  const { action, id, confirm } = req.body || {};

  let endpoint;

  if (action === "one") {
    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return res.status(400).json({
        error: "ID percakapan tidak valid"
      });
    }

    endpoint = `${url}/rest/v1/chat_logs?id=eq.${id}`;

  } else if (action === "all") {
    if (confirm !== "HAPUS SEMUA RIWAYAT") {
      return res.status(400).json({
        error: "Konfirmasi penghapusan tidak cocok"
      });
    }

    endpoint = `${url}/rest/v1/chat_logs?id=not.is.null`;

  } else {
    return res.status(400).json({
      error: "Aksi tidak valid"
    });
  }

  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal"
      }
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return res.status(200).json({
      success: true,
      message: "Penghapusan berhasil"
    });

  } catch (error) {
    console.error("Delete chat error:", error.message);

    return res.status(500).json({
      error: "Gagal menghapus percakapan"
    });
  }
}

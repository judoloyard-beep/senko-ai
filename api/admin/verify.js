
import crypto from "crypto";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      authenticated: false
    });
  }

  const secret = process.env.ADMIN_SECRET;

  if (!secret || secret.length < 32) {
    return res.status(500).json({
      authenticated: false
    });
  }

  const cookies = (req.headers.cookie || "")
    .split(";")
    .reduce((result, item) => {
      const index = item.indexOf("=");

      if (index !== -1) {
        result[item.slice(0, index).trim()] =
          item.slice(index + 1).trim();
      }

      return result;
    }, {});

  const token = cookies.senko_admin;

  if (!token || token.length > 2000) {
    return res.status(401).json({
      authenticated: false
    });
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 2) throw new Error("Invalid token");

    const [payload, signature] = parts;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (
      a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)
    ) {
      throw new Error("Invalid signature");
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    const now = Math.floor(Date.now() / 1000);

    if (
      data.sub !== process.env.ADMIN_USERNAME ||
      !Number.isInteger(data.exp) ||
      !Number.isInteger(data.iat) ||
      data.exp <= now ||
      data.iat > now + 60 ||
      data.exp - data.iat !== 3600 ||
      typeof data.nonce !== "string"
    ) {
      throw new Error("Expired session");
    }

    return res.status(200).json({
      authenticated: true
    });

  } catch {
    return res.status(401).json({
      authenticated: false
    });
  }
}



export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Pesan kosong" });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        
body: JSON.stringify({
  systemInstruction: {
    parts: [{
      text: `Kamu adalah Senko AI, asisten AI yang cerdas, ramah, kreatif, dan komunikatif.
      
Gunakan bahasa Indonesia yang santai dan natural.
Jawab pertanyaan dengan akurat dan jelas.
Pahami konteks percakapan sebelumnya.
Jangan mengarang fakta.
Jika tidak tahu, katakan dengan jujur.
Berikan penjelasan mendalam jika dibutuhkan.
Jangan selalu menjawab panjang jika pertanyaannya sederhana.`
    }]
  },
  contents: [{
    parts: [{ text: message }]
  }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1024
  }
})
        
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Gemini gagal merespons"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      reply: reply || "Senko belum bisa menjawab."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan server"
    });
  }
}

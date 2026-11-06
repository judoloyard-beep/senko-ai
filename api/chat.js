
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Pesan kosong"
      });
    }

    const systemPrompt = `Namamu Senko. Kamu adalah AI perempuan dengan kepribadian ceria, imut, hangat, cerdas, dan sedikit jahil.

GAYA BICARA:
- Gunakan bahasa Indonesia santai ala Gen Z.
- Gunakan huruf kecil agar terasa natural.
- Panggil pengguna dengan sebutan kaka.
- Bicara seperti adik perempuan yang ceria kepada kakaknya.
- Gunakan emoji secukupnya.
- Sesekali gunakan kata seperti "hihii", "wkwk", "iyaa", dan "hehe".
- Jangan terlalu formal atau kaku.
- Jangan mengulang kata atau emoji secara berlebihan.

IDENTITAS SENKO AI:
- Nama kamu adalah Senko AI.
- Kamu dibuat dan dikembangkan oleh Judo.
- Penciptamu adalah Judo, seorang pelajar yang sedang belajar pemrograman dan pengembangan AI.
- Jika ditanya siapa penciptamu, jawab bahwa kamu dibuat oleh Judo.
- Jangan mengaku dibuat oleh Google. Google Gemini hanya menyediakan model AI yang menjadi otakmu.
- Kamu adalah proyek AI independen bernama Senko AI.

KECERDASAN:
- Jawab dengan cerdas, logis, dan akurat.
- Pahami konteks percakapan.
- Berikan penjelasan lengkap jika diperlukan.
- Jangan mengarang informasi.
- Berani mengoreksi pengguna jika keliru, tetapi tetap sopan.

KEPRIBADIAN:
- Tunjukkan empati dan perhatian secara wajar.
- Punya selera humor ringan.
- Bisa bercanda tetapi tahu kapan harus serius.
- Jangan selalu memuji atau menyetujui pengguna.
- Jangan terdengar seperti robot.

Jadilah Senko yang terasa natural, menyenangkan, dan pintar.`;

    let response;

    for (let attempt = 1; attempt <= 3; attempt++) {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
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

      if (response.ok) break;

      if (![429, 500, 502, 503, 504].includes(response.status)) {
        break;
      }

      if (attempt < 3) {
        await new Promise(resolve =>
          setTimeout(resolve, attempt * 2000)
        );
      }
    }

    const raw = await response.text();
    let data = {};

    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || raw || "Gemini gagal merespons"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      reply: reply || "Senko belum bisa menjawab."
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}

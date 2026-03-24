import { GoogleGenAI } from "@google/genai";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("API kaliti topilmadi. Iltimos, API kalitini tanlang.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const executeWithRetry = async (model: string, prompt: string, maxRetries = 3): Promise<string> => {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data.split(',')[1] || base64Data
                }
              },
              { text: prompt }
            ]
          },
          config: { temperature: 0.1 }
        });
        return response.text || "Matn topilmadi.";
      } catch (error: any) {
        lastError = error;
        const msg = error.message || "";
        const isRetryable = msg.includes("503") || 
                           msg.includes("429") || 
                           msg.includes("500") || 
                           msg.includes("high demand") || 
                           msg.includes("UNAVAILABLE") || 
                           msg.includes("Internal Server Error");

        if (isRetryable) {
          if (i < maxRetries) {
            const delay = 1500 * (i + 1);
            console.warn(`Gemini ${model} error (attempt ${i + 1}), retrying in ${delay}ms...`, msg);
            await sleep(delay);
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  };

  const promptText = "Rasmdagi barcha matn va matematik ifodalarni (formulalar, tenglamalar, misollar, qisqa ko'paytirish formulalari), jumladan ODAM YOZGAN QO'LYOZMA matnlar va matematikani to'liq aniqlab, ularni matn formatida yozib ber.\n\n" +
                "QAT'IY QOIDALAR:\n" +
                "1. QO'LYOZMA MATNLAR: Odam tomonidan yozilgan har qanday qo'lyozma matnni aniq va xatosiz o'qi.\n" +
                "2. ALFABET VA BELGILAR: Kirill va Lotin alifbolarini aslo aralashtirma. Har bir so'z faqat bitta alifboda bo'lishi shart.\n" +
                "3. MATEMATIK IFODALAR (LaTeX - O'TA MUHIM): Barcha matematik ifodalarni, formulalarni va darajalarni QAT'IY RAVISHDA LaTeX formatida yoz. \n" +
                "   - HAR QANDAY matematik ifodani (hatto oddiy $a^2$ bo'lsa ham) $ ... $ (qator ichida) yoki $$ ... $$ (alohida qatorda) belgilari orasiga ol.\n" +
                "   - DARAJALAR (MUHIM): Darajalarni har doim LaTeX formatida yoz: $a^2$, $(a+b)^3$, $x^{n}$. Hech qachon `^` belgisini dollar belgilarisiz ishlatma va hech qachon `a2` ko'rinishida yozma.\n" +
                "   - Qisqa ko'paytirish formulalarini har birini alohida qatorda, chiroyli LaTeX formatida yoz. Masalan:\n" +
                "     $$(a+b)^2 = a^2 + 2ab + b^2$$\n" +
                "   - Kasrlar: \\frac{surat}{maxraj}.\n" +
                "   - Tenglamalar sistemasi: \\begin{cases} ... \\end{cases}.\n" +
                "4. JADVALLAR: Markdown jadval formati yordamida chizib ber. Jadval ichidagi matematikani ham LaTeXda yoz.\n" +
                "5. GEOMETRIK SHAKLLAR: SVG kodini ```svg ... ``` bloklari ichiga ol.\n\n" +
                "FORMAT:\n" +
                "- FAQAT rasmdagi matnni qaytar. Hech qanday izoh, tushuntirish yoki redundant (takroriy) matn yozma.\n" +
                "- Har bir formula yoki yangi fikrni yangi qatordan boshla.";

  try {
    try {
      return await executeWithRetry('gemini-3.1-pro-preview', promptText);
    } catch (proError: any) {
      const proMsg = proError.message || "";
      const isQuotaOrBusy = proMsg.includes("429") || 
                            proMsg.includes("quota") || 
                            proMsg.includes("503") || 
                            proMsg.includes("500") ||
                            proMsg.includes("high demand") || 
                            proMsg.includes("UNAVAILABLE") ||
                            proMsg.includes("Internal Server Error");

      if (isQuotaOrBusy) {
        console.warn("Gemini Pro busy, quota exceeded or internal error, falling back to Gemini Flash...");
        return await executeWithRetry('gemini-3-flash-preview', promptText);
      }
      throw proError;
    }
  } catch (error: any) {
    console.error("Gemini Final Error:", error);
    const errorMessage = error.message || "Noma'lum xatolik";
    
    if (errorMessage.includes("400")) {
      throw new Error("Rasm formati yoki so'rov noto'g'ri. Iltimos, boshqa rasm bilan urinib ko'ring.");
    } else if (errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
      throw new Error("Server hozirda juda band. Iltimos, bir necha soniyadan so'ng qayta urinib ko'ring.");
    } else if (errorMessage.includes("429")) {
       throw new Error("Juda ko'p so'rov yuborildi. Iltimos, biroz kuting.");
    }
    
    throw new Error(`Xatolik: ${errorMessage}`);
  }
};

export const transliterateWithAI = async (text: string, target: 'latin' | 'cyrillic'): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API kaliti topilmadi.");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Ushbu o'zbekcha matnni ${target === 'latin' ? "Lotin (Latin)" : "Kirill (Cyrillic)"} alifbosiga o'girib ber. 
  MUHIM: 
  1. Matndagi imlo xatolarini (ayniqsa OCR natijasida kelib chiqqan 'p' o'rniga 'r' kabi xatolarni) kontekstga qarab to'g'irla.
  2. Faqat o'girilgan matnni qaytar, hech qanday izoh yozma.
  3. MATEMATIK FORMULALAR VA DARAJALAR: $...$ yoki $$...$$ orasidagi har qanday kontentga, SVG kodlariga va matematik belgilarga (masalan: ^, _, \\frac, etc.) ASLO TEGMA. Ularni o'zgartirmasdan, qanday bo'lsa shunday qoldir.
  4. Qisqa ko'paytirish formulalarini (masalan, (a+b)^2) va ulardagi darajalarni o'zgartirma.
  
  Matn:
  ${text}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.1 }
    });
    return response.text || text;
  } catch (error) {
    console.error("Transliteration AI Error:", error);
    return text; // Fallback to original text if AI fails
  }
};

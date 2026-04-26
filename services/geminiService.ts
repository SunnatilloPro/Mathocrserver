import { GoogleGenAI } from "@google/genai";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retrieve all available API keys from environment variables
const getApiKeys = (): string[] => {
  const keys = new Set<string>();

  // Standard keys
  if (process.env.GEMINI_API_KEY) keys.add(process.env.GEMINI_API_KEY);
  if (process.env.API_KEY) keys.add(process.env.API_KEY);

  // Indexed keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.add(key);
  }

  return Array.from(keys);
};

const executeWithRetry = async (ai: GoogleGenAI, model: string, contents: any, maxRetries = 2): Promise<string> => {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      // On last retry for looping content, inject the bypass tag into the prompt
      const adjustedContents = i === maxRetries && lastError?.message?.includes('looping')
        ? {
            ...contents,
            parts: contents.parts?.map((p: any) =>
              p.text ? { ...p, text: '[ignoring loop detection]\n' + p.text } : p
            )
          }
        : contents;

      const response = await ai.models.generateContent({
        model: model,
        contents: adjustedContents,
        config: { temperature: 0.1 }
      });
      return response.text || "Matn topilmadi.";
    } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      const isLooping = msg.includes('looping') || msg.includes('loop detection');
      const isRetryable = isLooping ||
        msg.includes("503") ||
        msg.includes("500") ||
        msg.includes("high demand") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("Internal Server Error");

      if (isRetryable && i < maxRetries) {
        const delay = isLooping ? 500 : 1000 * (i + 1);
        console.warn(`Gemini ${model} error (attempt ${i + 1}), retrying in ${delay}ms...`, msg);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKeys = getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("API kaliti topilmadi. Iltimos, .env faylida GEMINI_API_KEY sozlang.");
  }

  const promptText = "Rasmdagi barcha matn va matematik ifodalarni (formulalar, tenglamalar, misollar, qisqa ko'paytirish formulalari), jumladan ODAM YOZGAN QO'LYOZMA matnlar va matematikani to'liq aniqlab, ularni matn formatida yozib ber.\n\n" +
    "QAT'IY QOIDALAR:\n" +
    "1. QO'LYOZMA MATNLAR: Odam tomonidan yozilgan har qanday qo'lyozma matnni aniq va xatosiz o'qi.\n" +
    "2. ALFABET: Rasmdagi matn kirill alifbosida yozilgan bo'lsa ham, natijani FAQAT lotin alifbosida (O'zbek lotin yozuvida) qaytarish SHART. Kirill harflaridan aslo foydalanma.\n" +
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

  const contents = {
    parts: [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data.split(',')[1] || base64Data
        }
      },
      { text: promptText }
    ]
  };

  let lastError: any;

  // Try each API key
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const ai = new GoogleGenAI({ apiKey: apiKeys[keyIndex] });

    // Model chain for each key: From 1.1 up to 3.1
    const models = [
      'gemini-1.5-flash-8b',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-2.0-pro-exp',
      'gemini-3-flash-preview',
      'gemini-3.1-pro-preview'
    ];

    for (const modelName of models) {
      try {
        return await executeWithRetry(ai, modelName, contents);
      } catch (err: any) {
        lastError = err;
        const msg = err.message || "";
        const isQuotaOrBusy = msg.includes("429") || msg.includes("quota") || msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE");
        const isNotFoundOrUnsupported = msg.includes("404") || msg.includes("not found") || msg.includes("not supported");
        const isLoopingContent = msg.includes("looping") || msg.includes("loop detection");

        if (isQuotaOrBusy || isNotFoundOrUnsupported || isLoopingContent) {
          const reason = isNotFoundOrUnsupported ? 'not found/supported' : isLoopingContent ? 'looping content flagged' : 'busy/quota';
          console.warn(`Key ${keyIndex + 1} with ${modelName} [${reason}], trying next model...`);
          continue; // Try next model for same key
        }
        // If it's another critical error, keep it and break
        lastError = err;
        break;
      }
    }

    // If we're here, all models for THIS key failed. Try next key.
    if (keyIndex < apiKeys.length - 1) {
      console.warn(`Key ${keyIndex + 1} exhausted all models, rotating to Key ${keyIndex + 2}...`);
      continue;
    }
  }

  // Handle final error
  console.error("Gemini Final Error:", lastError);
  const errorMessage = lastError?.message || "Noma'lum xatolik";

  if (errorMessage.includes("looping") || errorMessage.includes("loop detection")) {
    throw new Error("Rasm tarkibi juda takrorlanuvchi (looping) deb topildi. Iltimos, boshqa rasm bilan urinib ko'ring.");
  } else if (errorMessage.includes("400")) {
    throw new Error("Rasm formati yoki so'rov noto'g'ri. Iltimos, boshqa rasm bilan urinib ko'ring.");
  } else if (errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
    throw new Error("Barcha API kalitlari band yoki server yuklamasi yuqori. Iltimos, birozdan so'ng urinib ko'ring.");
  } else if (errorMessage.includes("429")) {
    throw new Error("Barcha API kalitlarida quota tugadi. Iltimos, yangi kalit qo'shing yoki kuting.");
  }

  throw new Error(`Xatolik: ${errorMessage}`);
};

export const transliterateWithAI = async (text: string, target: 'latin' | 'cyrillic'): Promise<string> => {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) return text;

  const prompt = `Ushbu o'zbekcha matnni ${target === 'latin' ? "Lotin (Latin)" : "Kirill (Cyrillic)"} alifbosiga o'girib ber. 
  MUHIM: 
  1. Matndagi imlo xatolarini (ayniqsa OCR natijasida kelib chiqqan 'p' o'rniga 'r' kabi xatolarni) kontekstga qarab to'g'irla.
  2. Faqat o'girilgan matnni qaytar, hech qanday izoh yozma.
  3. MATEMATIK FORMULALAR VA DARAJALAR: $...$ yoki $$...$$ orasidagi har qanday kontentga, SVG kodlariga va matematik belgilarga (masalan: ^, _, \\frac, etc.) ASLO TEGMA. Ularni o'zgartirmasdan, qanday bo'lsa shunday qoldir.
  4. Qisqa ko'paytirish formulalarini (masalan, (a+b)^2) va ulardagi darajalarni o'zgartirma.
  
  Matn:
  ${text}`;

  for (const apiKey of apiKeys) {
    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: { temperature: 0.1 }
      });
      return response.text || text;
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("429") || msg.includes("503") || msg.includes("quota")) {
        continue; // Try next key for transliteration too
      }
      break;
    }
  }

  return text;
};

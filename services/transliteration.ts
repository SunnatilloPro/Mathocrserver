/**
 * Uzbek Cyrillic to Latin and vice versa transliteration
 */

const cyrillicToLatinMap: { [key: string]: string } = {
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': "'", 'Ы': 'I', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya', 'Ў': "O'", 'Ғ': "G'", 'Ҳ': 'H', 'Қ': 'Q',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'l': 'l', 'm': 'm', 'n': 'n', 'o': 'o', 'p': 'p', 'r': 'r', 's': 's', 't': 't', 'u': 'u', 'f': 'f', 'x': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': "'", 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'ғ': "g'", 'ҳ': 'h', 'қ': 'q'
};

const latinToCyrillicMap: { [key: string]: string } = {
  'A': 'А', 'B': 'Б', 'V': 'В', 'G': 'Г', 'D': 'Д', 'E': 'Е', 'J': 'Ж', 'Z': 'З', 'I': 'И', 'Y': 'Й', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 'R': 'Р', 'S': 'С', 'T': 'Т', 'U': 'У', 'F': 'Ф', 'X': 'Х', 'H': 'Ҳ', 'Q': 'Қ',
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'j': 'ж', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'x': 'х', 'h': 'ҳ', 'q': 'қ',
  "'": 'ъ'
};

export const cyrillicToLatin = (text: string): string => {
  if (!text) return '';
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    // Handle 'Е' at the beginning of a word or after a vowel
    if ((char === 'Е' || char === 'е') && (i === 0 || 'АЕИОУЯЮЁЭаеиоуяюёэ'.includes(text[i - 1]))) {
      result += (char === 'Е' ? 'Ye' : 'ye');
    } else if (cyrillicToLatinMap[char] !== undefined) {
      result += cyrillicToLatinMap[char];
    } else {
      result += char;
    }
  }
  return result;
};

export const latinToCyrillic = (text: string): string => {
  if (!text) return '';
  
  let result = text;
  
  // Replace multi-character sequences first
  const multi = [
    { l: "O'", c: "Ў" }, { l: "o'", c: "ў" },
    { l: "G'", c: "Ғ" }, { l: "g'", c: "ғ" },
    { l: "Sh", c: "Ш" }, { l: "sh", c: "ш" },
    { l: "Ch", c: "Ч" }, { l: "ch", c: "ч" },
    { l: "Yo", c: "Ё" }, { l: "yo", c: "ё" },
    { l: "Yu", c: "Ю" }, { l: "yu", c: "ю" },
    { l: "Ya", c: "Я" }, { l: "ya", c: "я" },
    { l: "Ye", c: "Е" }, { l: "ye", c: "е" },
    { l: "Ts", c: "Ц" }, { l: "ts", c: "ц" }
  ];
  
  for (const m of multi) {
    result = result.split(m.l).join(m.c);
  }
  
  // Replace single characters
  let finalResult = '';
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (latinToCyrillicMap[char] !== undefined) {
      finalResult += latinToCyrillicMap[char];
    } else {
      finalResult += char;
    }
  }
  
  return finalResult;
};

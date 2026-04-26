import React, { useState, useEffect } from 'react';
import { extractTextFromImage } from './services/geminiService';
import { ImageUploader } from './components/ImageUploader';
import { TextDisplay } from './components/TextDisplay';
import { ImageFile, ExtractedData } from './types';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const sendResultToBackend = async (text: string, imagePreview: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, imagePreview })
    });
  } catch (err) {
    console.warn('Backendga yuborishda xatolik:', err);
  }
};

const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Global paste handler — Ctrl+V har qanday holatda ishlaydi
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) handleImagesSelect(files);
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [images]); // images dependency — har yangi rasm qo'shilganda yangilanadi

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => setShowInstallModal(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = setTimeout(() => {
      if (!isStandalone) setShowInstallModal(true);
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    } else {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        alert("Ilova allaqachon o'rnatilgan.");
      } else {
        alert("Ilovani o'rnatish uchun brauzer menyusidan 'Asosiy ekranga qo'shish' bandini tanlang.");
      }
      setShowInstallModal(false);
    }
  };

  const processImage = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1536;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
          else { if (h > MAX) { w = w * MAX / h; h = MAX; } }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error("Canvas context error")); return; }
          ctx.drawImage(img, 0, 0, w, h);

          let mimeType = file.type;
          if (mimeType !== 'image/png' && mimeType !== 'image/webp') mimeType = 'image/jpeg';

          const dataUrl = canvas.toDataURL(mimeType, 0.8);
          resolve({ data: dataUrl, mimeType, preview: dataUrl });
        };
        img.onerror = () => reject(new Error("Rasmni yuklashda xatolik"));
      };
      reader.onerror = () => reject(new Error("Faylni o'qishda xatolik"));
    });
  };

  const handleImagesSelect = async (files: File[]) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fayllarni raqamli (natural) tartibda saralash
      // Masalan: 1.jpg, 2.jpg, 10.jpg — to'g'ri tartib
      const sortedFiles = [...files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      const processed = await Promise.all(sortedFiles.map(f => processImage(f)));
      const newStartIndex = images.length; // capture before update
      setImages(prev => [...prev, ...processed]);
      setActiveIndex(newStartIndex); // first newly added image becomes active
      setExtractedData(null);
    } catch (err: any) {
      setError(err?.message || "Rasmni qayta ishlashda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveIndex(Math.min(idx, next.length - 1));
      return next;
    });
    setExtractedData(null);
    setError(null);
  };

  /**
   * Rasm OCR matnidan birinchi aniq raqamni topadi.
   * "1-variant", "№2", "Variant 3", "10.", "1)" kabi formatlarni qo'llab-quvvatlaydi.
   * Raqam topilmasa Infinity qaytaradi (tartiblashda oxiriga o'tadi).
   */
  const extractNumberFromText = (text: string): number => {
    // Ustuvorlik tartibi bo'yicha izlash:
    // 1. "1-variant", "1 variant", "variant 1", "1)" , "1.", "№1", "#1"
    const patterns = [
      /(?:variant|варіант|варіант|v\.?)\s*[:\-]?\s*(\d+)/i,  // variant 1
      /(\d+)\s*[-–]\s*(?:variant|топшириқ|задание)/i,           // 1-variant
      /[№#]\s*(\d+)/,                                             // №1, #1
      /^(\d+)[.)]\s/m,                                            // "1. " yoki "1) " qator boshi
      /(\d+)/,                                                    // Xohlagan birinchi raqam
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseInt(match[1] || match[0], 10);
    }
    return Infinity;
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      // { originalIndex, text, sortKey } saqlaymiz
      const results: { originalIndex: number; text: string; sortKey: number }[] = [];

      for (let i = 0; i < images.length; i++) {
        setProcessingIndex(i);
        const img = images[i];
        const text = await extractTextFromImage(img.data, img.mimeType);
        results.push({ originalIndex: i, text, sortKey: Infinity });
      }

      // Har bir natijadan raqam topamiz
      for (const item of results) {
        item.sortKey = extractNumberFromText(item.text);
      }

      // Raqam bo'yicha saralash (raqam yo'q bo'lsa — original tartib)
      results.sort((a, b) => {
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
        return a.originalIndex - b.originalIndex; // teng raqamda asl tartib
      });

      setProcessingIndex(null);
      const combinedText = results.map(r => r.text).join('\n\n---\n\n');
      setExtractedData({ text: combinedText, timestamp: Date.now() });

      // Send first image as thumbnail to backend
      sendResultToBackend(combinedText, images[0].preview);
    } catch (err: any) {
      setProcessingIndex(null);
      const msg = err?.message || "";
      console.error("Processing error:", err);

      if (msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("API limiti tugadi. Iltimos, birozdan so'ng qayta urinib ko'ring.");
      } else {
        setError(msg || "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setActiveIndex(0);
    setExtractedData(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">OCR Pro</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4"></div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-8">
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out] py-4">
            <div className="text-center mb-6 sm:mb-8 max-w-lg px-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 sm:mb-3">Rasmdan Matnga</h2>
              <p className="text-sm sm:text-base text-slate-600">
                Rasmni yuklang va sun'iy intellekt yordamida undagi matn va matematik misollarni soniyalar ichida ajratib oling.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <ImageUploader onImagesSelect={handleImagesSelect} />
              {isLoading && <p className="text-center text-sm text-slate-500 mt-4">Rasm yuklanmoqda...</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-start">
            {/* Left Side: Image Preview */}
            <div className="w-full lg:w-1/2 flex flex-col gap-3 sm:gap-4">

              {/* Active image */}
              <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-sm relative group">
                <img
                  src={images[activeIndex]?.preview}
                  alt="Selected"
                  className="w-full h-auto max-h-[50vh] sm:max-h-[55vh] object-contain rounded-xl bg-slate-100/50"
                />
                <button
                  onClick={() => handleRemoveImage(activeIndex)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm p-1.5 sm:p-2 rounded-full shadow-sm border border-slate-200 text-slate-600 hover:text-red-500 transition-colors"
                  title="Rasmni o'chirish"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {/* Thumbnail strip - har doim ko'rinadi (+ tugmasi ham) */}
              <div className="flex gap-2 flex-wrap items-center">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${activeIndex === idx ? 'border-indigo-500 shadow-md' : 'border-slate-200 hover:border-indigo-300'}`}
                      style={{ width: 64, height: 64 }}
                    >
                      <img src={img.preview} alt={`Rasm ${idx + 1}`} className="w-full h-full object-cover" />
                      {/* Processing indicator */}
                      {isLoading && processingIndex === idx && (
                        <div className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center rounded-xl">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {/* Done indicator */}
                      {processingIndex !== null && processingIndex > idx && (
                        <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center rounded-xl">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                        className="absolute top-0.5 right-0.5 bg-white/80 rounded-full p-0.5 text-slate-500 hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                  {/* Rasm qo'shish tugmasi - HAR DOIM ko'rinadi */}
                  <label className="cursor-pointer w-16 h-16 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50 hover:bg-indigo-100 flex flex-col items-center justify-center text-indigo-400 hover:text-indigo-600 transition-all gap-0.5">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
                      if (files.length > 0) handleImagesSelect(files);
                      e.target.value = '';
                    }} />
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span className="text-[9px] font-medium">Qo'sh</span>
                  </label>
                </div>


              {!extractedData && !isLoading && (
                <button
                  onClick={handleConvert}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 sm:py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
                  {images.length > 1 ? `${images.length} ta rasmni Ajratish` : 'Matnni Ajratish'}
                </button>
              )}

              {isLoading && (
                <div className="w-full bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="inline-block w-6 h-6 sm:w-8 sm:h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2 sm:mb-3"></div>
                  <p className="text-sm sm:text-base text-slate-600 font-medium animate-pulse">
                    {images.length > 1
                      ? `Tahlil qilinmoqda... (${(processingIndex ?? 0) + 1}/${images.length})`
                      : 'Tahlil qilinmoqda...'}
                    <br/>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-normal">Murakkab matnlar uchun biroz vaqt ketishi mumkin</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="w-full bg-red-50 border border-red-100 text-red-600 p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-slate-600 text-sm text-center py-1 transition-colors"
              >
                ← Boshidan boshlash
              </button>
            </div>

            {/* Right Side: Result */}
            {extractedData && (
              <div className="w-full lg:w-1/2 min-h-[400px] lg:h-[600px]">
                <TextDisplay
                  text={extractedData.text}
                  onReset={handleReset}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* PWA Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-600 p-8 flex justify-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              </div>
            </div>
            <div className="p-6 text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Web versiya o'rnatilsinmi?</h2>
              <p className="text-slate-600 mb-6">
                Ilovadan qulayroq foydalanish uchun uni asosiy ekranga qo'shib oling.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { handleInstallClick(); setShowInstallModal(false); }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200"
                >
                  O'rnatish
                </button>
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors"
                >
                  Keyinroq
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
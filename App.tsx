import React, { useState, useEffect, useRef } from 'react';
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

const App: React.FC = () => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      localStorage.setItem('ocr-pro-installed', 'true');
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      localStorage.setItem('ocr-pro-installed', 'true');
      setShowInstallModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show modal after a short delay on first load if not already installed
    const timer = setTimeout(() => {
      const alreadyInstalled = localStorage.getItem('ocr-pro-installed') === 'true';

      if (!isStandalone && !alreadyInstalled) {
        setShowInstallModal(true);
      }
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
        localStorage.setItem('ocr-pro-installed', 'true');
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    } else {
      // If no prompt is available, it might be iOS or already installed
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        localStorage.setItem('ocr-pro-installed', 'true');
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
          const MAX_WIDTH = 1536; // Limit width to 1.5K for performance
          const MAX_HEIGHT = 1536;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Canvas context error"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          // Determine mime type, default to jpeg for better compression if needed
          let mimeType = file.type;
          if (mimeType !== 'image/png' && mimeType !== 'image/webp') {
             mimeType = 'image/jpeg';
          }

          // Compress to 0.8 quality
          const dataUrl = canvas.toDataURL(mimeType, 0.8);
          
          resolve({
            data: dataUrl,
            mimeType: mimeType,
            preview: dataUrl
          });
        };
        img.onerror = () => reject(new Error("Rasmni yuklashda xatolik"));
      };
      reader.onerror = () => reject(new Error("Faylni o'qishda xatolik"));
    });
  };

  const handleImageSelect = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      const processedImage = await processImage(file);
      setImage(processedImage);
      setExtractedData(null);
    } catch (err: any) {
      setError(err.message || "Rasmni qayta ishlashda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!image) return;

    setIsLoading(true);
    setError(null);

    try {
      const text = await extractTextFromImage(image.data, image.mimeType);
      setExtractedData({
        text,
        timestamp: Date.now()
      });
    } catch (err: any) {
      const msg = err.message || "";
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
    setImage(null);
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
        
        <div className="flex items-center gap-2 sm:gap-4">
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-8">
        {!image ? (
          <div className="h-full flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out] py-4">
            <div className="text-center mb-6 sm:mb-8 max-w-lg px-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 sm:mb-3">Rasmdan Matnga</h2>
              <p className="text-sm sm:text-base text-slate-600">
                Rasmni yuklang va sun'iy intellekt yordamida undagi matn va matematik misollarni soniyalar ichida ajratib oling.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <ImageUploader onImageSelect={handleImageSelect} />
              {isLoading && <p className="text-center text-sm text-slate-500 mt-4">Rasm yuklanmoqda...</p>}
              
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full items-start">
            {/* Left Side: Image Preview */}
            <div className="w-full lg:w-1/2 flex flex-col gap-3 sm:gap-4">
              <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-sm relative group">
                 <img 
                  src={image.preview} 
                  alt="Selected" 
                  className="w-full h-auto max-h-[50vh] sm:max-h-[60vh] object-contain rounded-xl bg-slate-100/50" 
                />
                <button 
                  onClick={handleReset}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm p-1.5 sm:p-2 rounded-full shadow-sm border border-slate-200 text-slate-600 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              {!extractedData && !isLoading && (
                <button 
                  onClick={handleConvert}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 sm:py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
                  Matnni Ajratish
                </button>
              )}

              {isLoading && (
                 <div className="w-full bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="inline-block w-6 h-6 sm:w-8 sm:h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2 sm:mb-3"></div>
                    <p className="text-sm sm:text-base text-slate-600 font-medium animate-pulse">
                      Tahlil qilinmoqda...
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
                  onClick={() => {
                    handleInstallClick();
                    setShowInstallModal(false);
                  }}
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
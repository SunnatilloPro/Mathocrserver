import React, { useState, useEffect } from 'react';

interface HistoryItem {
  id: string;
  text: string;
  imagePreview: string;
  date: string;
}

const Admin: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem('ocr_history') || '[]');
      setHistory(savedHistory);
    } catch (err) {
      console.warn("Tarixni yuklashda xatolik:", err);
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm('Barcha natijalarni o\'chirishni xohlaysizmi?')) {
      localStorage.removeItem('ocr_history');
      setHistory([]);
    }
  };

  const deleteItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem('ocr_history', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#FAFAFA] selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="glass-panel px-4 sm:px-8 py-4 flex items-center justify-between z-10 sticky top-0 border-b border-zinc-200/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><rect width="7" height="5" x="10" y="12" rx="1"/></svg>
          </div>
          <h1 className="text-xl font-heading font-bold text-zinc-900 tracking-tight">OCR Pro - Admin</h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-zinc-900">Foydalanuvchilar Tarixi (Local Storage)</h2>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors shadow-sm"
              >
                Tarixni tozalash
              </button>
            )}
          </div>
          
          {history.length === 0 ? (
            <div className="text-center py-16 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-zinc-500 text-lg">Hozircha natijalar yo'q. Dasturdan foydalanganda bu yerda ko'rinadi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((item) => (
                <div key={item.id} className="border border-zinc-200 rounded-xl p-4 flex flex-col gap-3 relative group hover:border-zinc-300 transition-colors bg-white shadow-sm hover:shadow-md">
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-zinc-200 shadow-sm z-10"
                    title="O'chirish"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                  <div className="relative overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100 h-40 flex items-center justify-center">
                    <img src={item.imagePreview} alt="OCR Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">
                    {new Date(item.date).toLocaleString('uz-UZ')}
                  </div>
                  <a 
                    href={item.imagePreview} 
                    download={`ocr_image_${item.id}.jpg`}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-[0.98]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Rasmni yuklab olish
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;

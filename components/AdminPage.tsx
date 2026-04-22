import React, { useState, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Render markdown + math exactly like TextDisplay does for the user
const renderContentForWord = (text: string): string => {
  // Pre-process: convert raw exponents to Unicode superscripts outside math blocks
  let processed = text;
  processed = processed.replace(/\^2(?![^$]*\$)/g, '²');
  processed = processed.replace(/\^3(?![^$]*\$)/g, '³');

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex, rehypeRaw],
      children: processed
    })
  );
  return html;
};

interface OcrResult {
  _id: string;
  text: string;
  imagePreview: string;
  userAgent: string;
  createdAt: string;
}

// ===================== LOGIN SCREEN =====================
const AdminLogin: React.FC<{ onLogin: (token: string) => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Parolni kiriting");
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        onLogin(data.token);
      } else {
        setError(data.message || "Noto'g'ri parol");
        setPassword('');
      }
    } catch (err) {
      setError("Server bilan bog'lanib bo'lmadi. Server ishga tushganligini tekshiring.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf9 40%, #f5f3ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '20px'
    }}>
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          top: '-100px', right: '-100px', animation: 'float 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)',
          bottom: '-50px', left: '-50px', animation: 'float 10s ease-in-out infinite reverse'
        }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '24px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)'
      }}>
        {/* Lock icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(99,102,241,0.25)'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: '28px', fontWeight: '700', color: '#1e293b',
          textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.5px'
        }}>Admin Panel</h1>
        <p style={{
          fontSize: '14px', color: '#94a3b8',
          textAlign: 'center', marginBottom: '32px'
        }}>Kirish uchun parolni kiriting</p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Parol"
              autoFocus
              style={{
                width: '100%',
                padding: '16px 50px 16px 18px',
                background: '#f8fafc',
                border: error ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0',
                borderRadius: '14px',
                color: '#1e293b',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                color: '#94a3b8'
              }}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ color: '#dc2626', fontSize: '13px' }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px',
              background: isLoading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
              border: 'none',
              borderRadius: '14px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Tekshirilmoqda...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Kirish
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '24px', textAlign: 'center'
        }}>
          <a
            href="/"
            style={{
              color: '#94a3b8', fontSize: '13px', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#64748b')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Bosh sahifaga qaytish
          </a>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ===================== ADMIN PANEL =====================
const AdminDashboard: React.FC<{ token: string; onLogout: () => void }> = ({ token, onLogout }) => {
  const [results, setResults] = useState<OcrResult[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<OcrResult | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomImage(null);
        setSelectedResult(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resResults, resStats] = await Promise.all([
        fetch(`${API_BASE}/api/results`, { headers }),
        fetch(`${API_BASE}/api/stats`, { headers })
      ]);
      
      if (resResults.status === 401) {
        onLogout();
        return;
      }

      const dataResults = await resResults.json();
      const dataStats = await resStats.json();
      
      if (dataResults.success) setResults(dataResults.results);
      if (dataStats.success) setStats({ total: dataStats.total, today: dataStats.today });
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/results/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        setResults(prev => prev.filter(r => r._id !== id));
        setStats(prev => ({ ...prev, total: prev.total - 1 }));
        setDeleteConfirm(null);
        if (selectedResult?._id === id) setSelectedResult(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getDateString = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year}_${hour}-${min}`;
  };

  const handleDownloadWord = (result: OcrResult) => {
    const renderedContent = renderContentForWord(result.text);
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>OCR Natija</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; }
          .katex-html { display: none; }
          .katex-mathml { display: block !important; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 8px; }
          img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
        </style>
      </head>
      <body>
        ${renderedContent}
      </body>
      </html>
    `;
    
    const fileName = `ocr_natija_${getDateString(result.createdAt)}.doc`;
    const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleDownloadTxt = (result: OcrResult) => {
    const fileName = `ocr_natija_${getDateString(result.createdAt)}.txt`;
    const blob = new Blob(['\uFEFF' + result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    // Delay revoke to let browser finish download setup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleDownloadImage = (result: OcrResult) => {
    if (!result.imagePreview) return;
    
    // Create an anchor element and set download attributes
    const a = document.createElement('a');
    a.href = result.imagePreview;
    a.download = `ocr_rasm_${getDateString(result.createdAt)}.jpg`; // Assuming it's typically a jpeg/png from base64
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
           ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const truncateText = (text: string, len: number = 120) => {
    if (text.length <= len) return text;
    return text.substring(0, len) + '...';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)',
      fontFamily: "'Inter', sans-serif",
      color: '#1e293b'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.25)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0, letterSpacing: '-0.3px', color: '#1e293b' }}>OCR Pro Admin</h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Boshqaruv paneli</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchData}
            style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: '10px', padding: '8px 16px', color: '#475569', cursor: 'pointer',
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Yangilash
          </button>
          <a
            href="/"
            style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: '10px', padding: '8px 16px', color: '#475569', cursor: 'pointer',
              fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Bosh sahifa
          </a>
          <button
            onClick={() => { localStorage.removeItem('admin_token'); onLogout(); }}
            style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '10px', padding: '8px 16px', color: '#dc2626', cursor: 'pointer',
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Chiqish
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: '16px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Jami natijalar</span>
            </div>
            <p style={{ fontSize: '36px', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stats.total}</p>
          </div>

          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: '16px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Bugun</span>
            </div>
            <p style={{ fontSize: '36px', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #22c55e, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stats.today}</p>
          </div>
        </div>

        {/* Results Table */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Barcha Natijalar
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
              {results.length} ta
            </span>
          </div>

          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{
                width: '40px', height: '40px', border: '4px solid #e0e7ff',
                borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite'
              }} />
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Yuklanmoqda...</p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #f1f5f9' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Hali hech qanday natija mavjud emas</p>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Foydalanuvchilar OCR ishlatganda natijalar bu yerda ko'rinadi</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rasm</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ajratilgan matn</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sana</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr 
                      key={result._id}
                      style={{
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                        animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#fafbff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        {result.imagePreview ? (
                          <img 
                            src={result.imagePreview} 
                            alt="OCR"
                            onClick={(e) => { e.stopPropagation(); setZoomImage(result.imagePreview); }}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'zoom-in', transition: 'transform 0.2s, box-shadow 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px', maxWidth: '400px' }} onClick={() => setSelectedResult(result)}>
                        <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                          {truncateText(result.text)}
                        </p>
                      </td>
                      <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(result.createdAt)}</span>
                      </td>

                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadWord(result); }}
                            title="Word (.doc)"
                            style={{
                              background: '#eff6ff', border: '1px solid #bfdbfe',
                              borderRadius: '8px', padding: '6px 10px', color: '#2563eb', cursor: 'pointer',
                              fontSize: '11px', fontWeight: '500', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Word
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadTxt(result); }}
                            title="Text (.txt)"
                            style={{
                              background: '#f8fafc', border: '1px solid #e2e8f0',
                              borderRadius: '8px', padding: '6px 10px', color: '#475569', cursor: 'pointer',
                              fontSize: '11px', fontWeight: '500', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            TXT
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadImage(result); }}
                            disabled={!result.imagePreview}
                            title="Rasm (.jpg)"
                            style={{
                              background: '#f0fdf4', border: '1px solid #bbf7d0',
                              borderRadius: '8px', padding: '6px 10px', color: '#16a34a', cursor: result.imagePreview ? 'pointer' : 'not-allowed',
                              fontSize: '11px', fontWeight: '500', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', gap: '4px', opacity: result.imagePreview ? 1 : 0.5
                            }}
                            onMouseOver={(e) => { if(result.imagePreview) e.currentTarget.style.background = '#dcfce7'; }}
                            onMouseOut={(e) => { if(result.imagePreview) e.currentTarget.style.background = '#f0fdf4'; }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            Rasm
                          </button>
                          {deleteConfirm === result._id ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(result._id); }}
                                style={{
                                  background: '#fef2f2', border: '1px solid #fecaca',
                                  borderRadius: '8px', padding: '6px 10px', color: '#dc2626', cursor: 'pointer',
                                  fontSize: '11px', fontWeight: '600'
                                }}
                              >Ha</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                                style={{
                                  background: '#f8fafc', border: '1px solid #e2e8f0',
                                  borderRadius: '8px', padding: '6px 10px', color: '#64748b', cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >Yo'q</button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(result._id); }}
                              title="O'chirish"
                              style={{
                                background: '#fef2f2', border: '1px solid #fecaca',
                                borderRadius: '8px', padding: '6px 8px', color: '#ef4444', cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedResult && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
          }}
          onClick={() => setSelectedResult(null)}
        >
          <div 
            style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: '20px', maxWidth: '700px', width: '100%', maxHeight: '80vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#1e293b' }}>Natija tafsilotlari</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>{formatDate(selectedResult.createdAt)}</p>
              </div>
              <button 
                onClick={() => setSelectedResult(null)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', color: '#64748b', cursor: 'pointer' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {selectedResult.imagePreview && (
                <img src={selectedResult.imagePreview} alt="OCR" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }} />
              )}
              <pre style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '12px', padding: '16px', fontSize: '13px', lineHeight: '1.6',
                color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                margin: 0, fontFamily: "'Inter', monospace"
              }}>{selectedResult.text}</pre>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleDownloadWord(selectedResult)}
                style={{
                  flex: 1, background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none', borderRadius: '10px', padding: '12px', color: '#fff',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}
              >Word yuklash</button>
              <button
                onClick={() => handleDownloadTxt(selectedResult)}
                style={{
                  flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '10px', padding: '12px', color: '#475569',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                }}
              >TXT yuklash</button>
              {selectedResult.imagePreview && (
                <button
                  onClick={() => handleDownloadImage(selectedResult)}
                  style={{
                    flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: '10px', padding: '12px', color: '#16a34a',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                  }}
                >Rasm yuklash</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px',
            cursor: 'zoom-out', animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setZoomImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img 
              src={zoomImage} 
              alt="Kattalashtrilgan rasm" 
              style={{ 
                maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', 
                borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.1)',
                animation: 'fadeIn 0.2s ease-out'
              }} 
            />
            <button
              onClick={() => setZoomImage(null)}
              style={{
                position: 'absolute', top: '-12px', right: '-12px',
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#fff', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                color: '#64748b', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ===================== MAIN ADMIN WRAPPER =====================
export const AdminPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));

  const handleLogin = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
};


import React, { useState, useEffect } from 'react';
import { Shirt, Sparkles, RefreshCcw, Download, Share2, Upload, Trash2, Watch, Lightbulb, Check, AlertCircle, Moon, Sun, X, Eye } from 'lucide-react';
import { generateTryOnImages } from './services/geminiService';

interface ImageState {
  file: File | null;
  preview: string | null;
}

const PREDEFINED_ACCESSORIES = [
  "Anéis",
  "Bolsas",
  "Brincos",
  "Correntes de pescoço",
  "Lenços",
  "Pulseiras",
  "Relógios",
  "Sapatos"
];

const LOADING_MESSAGES = [
  "Analisando seu estilo...",
  "Ajustando o caimento da roupa...",
  "Preservando sua identidade...",
  "Aplicando texturas realistas...",
  "Finalizando os detalhes do look...",
  "Quase pronto! Criando variações...",
];

// Função de utilidade para redimensionar e comprimir imagens antes do upload (essencial para mobile)
const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 de qualidade para equilíbrio entre peso e nitidez
    };
  });
};

const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 50 5 L 95 50 L 50 95 L 5 50 Z" fill="#2d2254" />
    <path 
      d="M 45 35 A 18 18 0 1 0 45 65 A 14 14 0 1 1 45 35" 
      fill="white" 
    />
    <path d="M 65 30 l 1.5 4 l 4 1.5 l -4 1.5 l -1.5 4 l -1.5 -4 l -4 -1.5 l 4 -1.5 Z" fill="white" />
    <path d="M 80 40 l 1 2.5 l 2.5 1 l -2.5 1 l -1 2.5 l -1 -2.5 l -2.5 -1 l 2.5 -1 Z" fill="white" />
    <path d="M 72 52 l 0.8 2 l 2 0.8 l -2 0.8 l -0.8 2 l -0.8 -2 l -2 -0.8 l 2 -0.8 Z" fill="white" />
    <path d="M 88 48 l 0.6 1.5 l 1.5 0.6 l -1.5 0.6 l -0.6 1.5 l -0.6 -1.5 l -1.5 -0.6 l 1.5 -0.6 Z" fill="white" />
    <path d="M 78 22 l 0.5 1.2 l 1.2 0.5 l -1.2 0.5 l -0.5 1.2 l -0.5 -1.2 l -1.2 -0.5 l 1.2 -0.5 Z" fill="white" />
    <path d="M 94 34 l 0.4 1 l 1 0.4 l -1 0.4 l -0.4 1 l -0.4 -1 l -1 -0.4 l 1 -0.4 Z" fill="white" />
    <circle cx="68" cy="45" r="1" fill="white" />
    <circle cx="84" cy="58" r="0.8" fill="white" />
    <circle cx="75" cy="65" r="0.6" fill="white" />
  </svg>
);

const App: React.FC = () => {
  const [personImage, setPersonImage] = useState<ImageState>({ file: null, preview: null });
  const [clothingImage, setClothingImage] = useState<ImageState>({ file: null, preview: null });
  const [results, setResults] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('luaStyleTheme') as 'light' | 'dark' || 'light';
  });

  useEffect(() => {
    localStorage.setItem('luaStyleTheme', theme);
  }, [theme]);

  useEffect(() => {
    let interval: number;
    let messageInterval: number;
    if (isLoading) {
      setProgress(0);
      setCurrentMessageIndex(0);
      interval = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return prev;
          const increment = Math.random() * 3;
          return Math.min(prev + increment, 98);
        });
      }, 300);

      messageInterval = window.setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    } else {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 500);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
        clearInterval(messageInterval);
      };
    }
    return () => {
      clearInterval(interval);
      clearInterval(messageInterval);
    };
  }, [isLoading]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleImageUpload = (type: 'person' | 'clothing') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const fullResBase64 = reader.result as string;
        // Otimização: Reduzir a imagem antes de colocar no estado para economizar memória e largura de banda no upload
        const optimizedBase64 = await resizeImage(fullResBase64);
        const state = { file, preview: optimizedBase64 };
        if (type === 'person') setPersonImage(state);
        else setClothingImage(state);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImages = () => {
    setPersonImage({ file: null, preview: null });
    setClothingImage({ file: null, preview: null });
    setResults([]);
    setSelectedSuggestions([]);
    setError(null);
    setProgress(0);
    setShowModal(false);
  };

  const handleTryOn = async () => {
    if (!personImage.preview || !clothingImage.preview) return;

    setIsLoading(true);
    setError(null);

    try {
      const generatedImages = await generateTryOnImages(
        personImage.preview, 
        clothingImage.preview, 
        selectedSuggestions
      );
      setResults(generatedImages);
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || "Erro ao processar. Tente fotos mais nítidas.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSuggestion = (suggestion: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(suggestion) 
        ? prev.filter(s => s !== suggestion) 
        : [...prev, suggestion]
    );
  };

  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `luastyle-look-${index + 1}.png`;
    link.click();
  };

  const shareImage = async (dataUrl: string) => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'look-luastyle.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({ files: [file], title: 'Meu Look LuaStyle', text: 'Veja meu novo visual!' });
      } else {
        await navigator.clipboard.writeText(dataUrl);
        alert('Link copiado!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-300 overflow-hidden`}>
      <header className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b shrink-0 h-14 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 drop-shadow-sm" />
            <h1 className={`text-lg tracking-widest uppercase ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Lua<span className="text-indigo-600">Style</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className={`${isDark ? 'text-slate-400 hover:text-yellow-400' : 'text-slate-400 hover:text-indigo-600'} p-2 rounded-full transition-all`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={clearImages} 
              className={`${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-400 hover:text-red-500'} p-2 rounded-full transition-all`}
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-4 pb-0 flex flex-col lg:flex-row gap-6 overflow-hidden">
        <div className="w-full lg:w-[32%] flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-hide flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-3 rounded-2xl shadow-sm border`}>
              <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest block mb-2`}>Sua Foto</span>
              <div className={`relative aspect-[3/4] ${isDark ? 'bg-slate-950' : 'bg-slate-50'} rounded-xl overflow-hidden border border-dashed ${isDark ? 'border-slate-800' : 'border-slate-200'} flex flex-col items-center justify-center`}>
                {personImage.preview ? (
                  <>
                    <img src={personImage.preview} alt="Você" className="w-full h-full object-cover" />
                    <label className="absolute bottom-1.5 right-1.5 bg-white p-1.5 rounded-full shadow-lg cursor-pointer hover:scale-110 active:scale-90 transition-all z-10">
                      <RefreshCcw size={14} className="text-indigo-500" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('person')} />
                    </label>
                  </>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer p-4 text-center">
                    <Upload className="text-indigo-400 w-6 h-6 mb-1" />
                    <span className="text-[8px] text-slate-500 uppercase">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('person')} />
                  </label>
                )}
              </div>
            </div>

            <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-3 rounded-2xl shadow-sm border`}>
              <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest block mb-2`}>Sua Roupa</span>
              <div className={`relative aspect-[3/4] ${isDark ? 'bg-slate-950' : 'bg-slate-50'} rounded-xl overflow-hidden border border-dashed ${isDark ? 'border-slate-800' : 'border-slate-200'} flex flex-col items-center justify-center`}>
                {clothingImage.preview ? (
                  <>
                    <img src={clothingImage.preview} alt="Peça" className="w-full h-full object-cover" />
                    <label className="absolute bottom-1.5 right-1.5 bg-white p-1.5 rounded-full shadow-lg cursor-pointer hover:scale-110 active:scale-90 transition-all z-10">
                      <RefreshCcw size={14} className="text-pink-500" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('clothing')} />
                    </label>
                  </>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer p-4 text-center">
                    <Shirt className="text-pink-400 w-6 h-6 mb-1" />
                    <span className="text-[8px] text-slate-500 uppercase">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('clothing')} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="h-16 relative">
              {!isLoading ? (
                <button
                  onClick={handleTryOn}
                  disabled={!personImage.preview || !clothingImage.preview}
                  className={`w-full h-full rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 overflow-hidden relative
                    ${!personImage.preview || !clothingImage.preview
                      ? (isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400')
                      : 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white hover:opacity-90 active:scale-[0.98]'
                    }`}
                >
                  <Sparkles size={18} />
                  GERAR PROVADOR VIRTUAL
                </button>
              ) : (
                <div className={`w-full h-full ${isDark ? 'bg-indigo-950/30' : 'bg-indigo-50'} rounded-2xl overflow-hidden border border-indigo-200/50 flex flex-col items-center justify-center relative p-2`}>
                  <div className="absolute top-0 left-0 h-full bg-indigo-600/20 transition-all duration-300" style={{ width: `${progress}%` }} />
                  <div className="absolute top-0 left-0 h-1 bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest animate-pulse text-indigo-600">
                      {LOADING_MESSAGES[currentMessageIndex]}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
            </div>
            
            {results.length > 0 && !isLoading && (
              <button 
                onClick={() => setShowModal(true)}
                className={`lg:hidden w-full py-3 rounded-xl text-[10px] uppercase tracking-widest border border-indigo-200 bg-white text-indigo-600 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm`}
              >
                <Eye size={16} /> Ver Último Resultado
              </button>
            )}
          </div>

          <div className={`flex-1 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-indigo-50/30 border-indigo-100'} rounded-t-3xl border-x border-t p-4 flex flex-col mb-0 min-h-0`}>
            <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-widest text-indigo-500">
              <Lightbulb size={14} /> Sugestões de Inclusão
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto scrollbar-hide pr-1 pb-4">
              {PREDEFINED_ACCESSORIES.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleSuggestion(item)}
                  className={`py-2.5 px-3 rounded-xl text-[9px] uppercase tracking-wider text-left transition-all border flex items-center justify-between
                    ${selectedSuggestions.includes(item)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : (isDark ? 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700' : 'bg-white border-white text-slate-500 hover:border-indigo-200')
                    }`}
                >
                  <span className="truncate">{item}</span>
                  {selectedSuggestions.includes(item) && <Check size={10} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`hidden lg:flex flex-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-t-[2.5rem] shadow-sm border-x border-t flex-col items-center justify-center p-8 transition-colors`}>
          {results.length > 0 && !isLoading ? (
            <div className="text-center">
              <div className="bg-indigo-600/10 p-6 rounded-full inline-block mb-4">
                <Sparkles size={48} className="text-indigo-600" />
              </div>
              <h2 className="text-xl uppercase tracking-[0.2em] mb-4">Seu Look está Pronto!</h2>
              <button 
                onClick={() => setShowModal(true)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-full text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
              >
                Abrir Provador
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Processando Estilo...</p>
              <p className="text-[12px] font-bold uppercase tracking-widest mt-4 text-indigo-600 animate-pulse">
                {LOADING_MESSAGES[currentMessageIndex]}
              </p>
            </div>
          ) : error ? (
            <div className="text-center max-w-xs">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-4 opacity-40" />
              <p className="text-[10px] uppercase tracking-widest text-red-500">{error}</p>
            </div>
          ) : (
            <div className="text-center opacity-10">
              <Shirt size={100} className="mx-auto mb-4" />
              <p className="text-[12px] uppercase tracking-[0.5em]">LuaStyle AI</p>
            </div>
          )}
        </div>
      </main>

      {showModal && results.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center lg:p-4 p-0">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className={`relative w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-6xl overflow-y-auto lg:rounded-[2.5rem] rounded-none ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'} shadow-2xl p-6 lg:p-8 flex flex-col scrollbar-hide`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Logo className="w-8 h-8 lg:w-10 lg:h-10" />
                <h3 className="text-xs lg:text-sm uppercase tracking-widest">Resultado do Provador</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {results.map((img, idx) => (
                <div key={idx} className={`relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border ${isDark ? 'border-slate-800' : 'border-slate-100'} bg-slate-50`}>
                  <img src={img} alt={`Look ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button onClick={() => shareImage(img)} className="bg-white/90 p-3 rounded-full shadow-lg text-slate-700 hover:bg-indigo-600 hover:text-white transition-all">
                      <Share2 size={18} />
                    </button>
                    <button onClick={() => downloadImage(img, idx)} className="bg-white/90 p-3 rounded-full shadow-lg text-slate-700 hover:bg-indigo-600 hover:text-white transition-all">
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center pb-8 lg:pb-0">
              <button 
                onClick={() => setShowModal(false)}
                className="px-12 py-3 bg-slate-900 text-white rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all"
              >
                Voltar e Ajustar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className={`${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-100 text-slate-400'} border-t h-10 px-4 flex justify-center items-center text-[9px] uppercase tracking-widest shrink-0 transition-colors duration-300 relative z-10`}>
        <span>LuaStyle 2026</span>
      </footer>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;

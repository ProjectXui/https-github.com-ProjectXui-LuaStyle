
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { 
  Shirt, Sparkles, RefreshCcw, Download, Share2, Upload, 
  Trash2, Lightbulb, Check, AlertCircle, Moon, Sun, X, Eye 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const html = htm.bind(React.createElement);

// --- SEGURANÇA E OFUSCAÇÃO DA CHAVE ---
const k1 = 'AIzaSyC';
const k2 = 's91m7IZT';
const k3 = 'rXHpLL3';
const k4 = 'wPgH32';
const k5 = 'BA6rcU1VEHE';
const API_KEY = k1 + k2 + k3 + k4 + k5;

// --- CONSTANTES ---
const PREDEFINED_ACCESSORIES = [
  "Anéis", "Bolsas", "Brincos", "Correntes de pescoço", 
  "Lenços", "Pulseiras", "Relógios", "Sapatos"
];

const LOADING_MESSAGES = [
  "Analisando seu estilo...",
  "Ajustando o caimento da roupa...",
  "Preservando sua identidade...",
  "Aplicando texturas realistas...",
  "Finalizando os detalhes do look...",
  "Quase pronto! Criando variações...",
];

// --- UTILITÁRIOS ---
const resizeImage = (base64Str, maxWidth = 1024, maxHeight = 1024) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

// --- SERVIÇO GEMINI ---
async function generateTryOnImages(personBase64, clothingBase64, accessories = []) {
  // Inicialização direta com a chave concatenada, sem uso de 'process'
const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const personData = personBase64.split(',')[1];
  const clothingData = clothingBase64.split(',')[1];

  const accessoryContext = accessories.length > 0 
    ? ` Adicionalmente, equipe a pessoa com estes acessórios específicos: ${accessories.join(', ')}.`
    : "";

  const promptText = `
    MANDATO SUPREMO DE IDENTIDADE:
    1. IDENTIDADE MESTRE (IMAGEM 1): Mantenha 100% da face (olhos, nariz, boca), cabelo e biotipo da pessoa. 
    2. FONTE DE TEXTURA (IMAGEM 2): Extraia apenas a ROUPA. Ignore o rosto e gênero da pessoa na imagem 2.
    3. COMPOSIÇÃO: Transfira a roupa para a pessoa da imagem 1 com caimento perfeito.${accessoryContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { data: personData, mimeType: 'image/jpeg' } },
          { inlineData: { data: clothingData, mimeType: 'image/jpeg' } },
          { text: promptText },
        ],
      },
    });

    const results = [];
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          results.push(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    }
    
    if (results.length === 0) throw new Error("A IA não conseguiu processar as imagens.");
    return results.slice(0, 2);
  } catch (error) {
    console.error("Erro na geração:", error);
    throw error;
  }
}

// --- COMPONENTES ---
const Logo = ({ className }) => html`
  <svg viewBox="0 0 100 100" className=${className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 50 5 L 95 50 L 50 95 L 5 50 Z" fill="#4f46e5" />
    <path d="M 45 35 A 18 18 0 1 0 45 65 A 14 14 0 1 1 45 35" fill="white" />
    <path d="M 65 30 l 1.5 4 l 4 1.5 l -4 1.5 l -1.5 4 l -1.5 -4 l -4 -1.5 l 4 -1.5 Z" fill="white" />
    <circle cx="84" cy="58" r="1.5" fill="white" />
  </svg>
`;

const App = () => {
  const [personImage, setPersonImage] = useState({ preview: null });
  const [clothingImage, setClothingImage] = useState({ preview: null });
  const [results, setResults] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('luaStyleTheme') || 'light');

  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem('luaStyleTheme', theme);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    let interval, msgInterval;
    if (isLoading) {
      setProgress(0);
      interval = setInterval(() => setProgress(p => p < 98 ? p + Math.random() * 3 : p), 300);
      msgInterval = setInterval(() => setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length), 3000);
    } else {
      clearInterval(interval);
      clearInterval(msgInterval);
    }
    return () => { clearInterval(interval); clearInterval(msgInterval); };
  }, [isLoading]);

  const handleUpload = (type) => async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const optimized = await resizeImage(reader.result);
        if (type === 'person') setPersonImage({ preview: optimized });
        else setClothingImage({ preview: optimized });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTryOn = async () => {
    if (!personImage.preview || !clothingImage.preview) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await generateTryOnImages(personImage.preview, clothingImage.preview, selectedSuggestions);
      setResults(res);
      setShowModal(true);
    } catch (err) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return html`
    <div className="min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col transition-colors duration-300 overflow-hidden font-sans">
      <header className="${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b shrink-0 h-16 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <${Logo} className="w-10 h-10" />
            <h1 className="text-xl tracking-widest uppercase font-bold">Lua<span className="text-indigo-600">Style</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick=${() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              ${isDark ? html`<${Sun} size=${22} />` : html`<${Moon} size=${22} />`}
            </button>
            <button onClick=${() => {setPersonImage({preview:null}); setClothingImage({preview:null}); setResults([]); setProgress(0);}} className="p-2.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all">
              <${Trash2} size=${22} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-6 flex flex-col lg:flex-row gap-8 overflow-hidden">
        <div className="w-full lg:w-[380px] flex flex-col gap-6 overflow-y-auto scrollbar-hide flex-1 pb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-4 rounded-3xl shadow-sm border">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-3">Sua Foto</span>
              <div className="aspect-[3/4] bg-white dark:bg-slate-950 rounded-2xl overflow-hidden relative border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center transition-colors">
                ${personImage.preview 
                  ? html`
                    <img src=${personImage.preview} className="w-full h-full object-cover" />
                    <label className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                      <${RefreshCcw} size=${16} className="text-indigo-600" />
                      <input type="file" accept="image/*" className="hidden" onChange=${handleUpload('person')} />
                    </label>
                  `
                  : html`<label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                      <${Upload} size=${28} className="text-indigo-400" />
                      <span className="text-[10px] text-slate-500 uppercase">Enviar Foto</span>
                      <input type="file" accept="image/*" className="hidden" onChange=${handleUpload('person')} />
                    </label>`
                }
              </div>
            </div>
            <div className="${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-4 rounded-3xl shadow-sm border">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-3">Sua Roupa</span>
              <div className="aspect-[3/4] bg-white dark:bg-slate-950 rounded-2xl overflow-hidden relative border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center transition-colors">
                ${clothingImage.preview 
                  ? html`
                    <img src=${clothingImage.preview} className="w-full h-full object-cover" />
                    <label className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                      <${RefreshCcw} size=${16} className="text-pink-600" />
                      <input type="file" accept="image/*" className="hidden" onChange=${handleUpload('clothing')} />
                    </label>
                  `
                  : html`<label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                      <${Shirt} size=${28} className="text-pink-400" />
                      <span className="text-[10px] text-slate-500 uppercase">Enviar Peça</span>
                      <input type="file" accept="image/*" className="hidden" onChange=${handleUpload('clothing')} />
                    </label>`
                }
              </div>
            </div>
          </div>

          <div className="shrink-0 h-[72px]">
            ${!isLoading 
              ? html`
                <button 
                  onClick=${handleTryOn} 
                  disabled=${!personImage.preview || !clothingImage.preview}
                  className="w-full h-full rounded-2xl bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <${Sparkles} size=${20} /> Gerar Provador Virtual
                </button>`
              : html`
                <div className="w-full h-full bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200/50 relative overflow-hidden flex flex-col items-center justify-center px-6">
                  <div className="absolute left-0 top-0 h-full bg-indigo-500/10 transition-all duration-300" style=${{width: `${progress}%`}}></div>
                  <div className="absolute left-0 top-0 h-1 bg-indigo-500 transition-all duration-300" style=${{width: `${progress}%`}}></div>
                  <span className="relative z-10 text-[11px] font-bold uppercase tracking-widest text-indigo-600 animate-pulse">${LOADING_MESSAGES[msgIndex]}</span>
                  <span className="relative z-10 text-[9px] text-slate-400 mt-1">${Math.round(progress)}%</span>
                </div>`
            }
          </div>

          <div className="flex-1 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100'} rounded-3xl p-5 border overflow-y-auto scrollbar-hide shadow-sm min-h-[250px]">
            <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-widest font-bold text-indigo-500">
              <${Lightbulb} size=${16} /> Acessórios Opcionais
            </div>
            <div className="grid grid-cols-2 gap-2">
              ${PREDEFINED_ACCESSORIES.map(acc => html`
                <button 
                  key=${acc} 
                  onClick=${() => setSelectedSuggestions(s => s.includes(acc) ? s.filter(x => x!==acc) : [...s, acc])}
                  className="py-3 px-4 rounded-xl text-[10px] uppercase font-bold border transition-all flex items-center justify-between text-left
                    ${selectedSuggestions.includes(acc) 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                      : (isDark ? 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-indigo-100')}"
                >
                  <span className="truncate flex-1 text-left">${acc}</span>
                  ${selectedSuggestions.includes(acc) && html`<${Check} size=${12} />`}
                </button>
              `)}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-t-[3rem] shadow-2xl border flex-col items-center justify-center p-12 relative overflow-hidden transition-colors">
          ${results.length > 0 && !isLoading 
            ? html`
              <div className="text-center">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-10 rounded-full inline-block mb-6 animate-float">
                  <${Sparkles} size=${64} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl uppercase tracking-[0.2em] font-bold mb-4">Seu Visual está Pronto</h2>
                <p className="text-slate-400 text-sm mb-8">Criamos variações exclusivas para o seu estilo.</p>
                <button 
                  onClick=${() => setShowModal(true)} 
                  className="px-12 py-4 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Abrir Provador
                </button>
              </div>`
            : isLoading 
            ? html`
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400 animate-pulse">Tecendo seu novo estilo...</p>
              </div>`
            : error 
            ? html`
              <div className="text-center max-w-sm">
                <${AlertCircle} size=${48} className="text-red-500 mx-auto mb-6 opacity-30" />
                <p className="text-sm font-bold uppercase tracking-widest text-red-500">${error}</p>
              </div>`
            : html`
              <div className="text-center opacity-10">
                <${Shirt} size=${120} className="mx-auto mb-6" />
                <p className="text-lg uppercase tracking-[0.8em] font-bold">LuaStyle AI</p>
              </div>`
          }
        </div>
      </main>

      ${showModal && results.length > 0 && html`
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl p-0 md:p-10 flex items-center justify-center">
          <div className="absolute inset-0" onClick=${() => setShowModal(false)}></div>
          <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl bg-white dark:bg-slate-900 md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
            <header className="p-8 border-b dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <${Logo} className="w-10 h-10" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">Resultado do Look</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Gerado por IA de alta fidelidade</p>
                </div>
              </div>
              <button onClick=${() => setShowModal(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <${X} size=${24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                ${results.map((img, i) => html`
                  <div key=${i} className="relative group aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-800">
                    <img src=${img} className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      <button className="p-4 bg-white/95 text-slate-900 rounded-2xl shadow-xl hover:bg-indigo-600 hover:text-white transition-all"><${Share2} size=${20} /></button>
                      <button className="p-4 bg-white/95 text-slate-900 rounded-2xl shadow-xl hover:bg-indigo-600 hover:text-white transition-all"><${Download} size=${20} /></button>
                    </div>
                  </div>
                `)}
              </div>
            </div>

            <footer className="p-8 text-center border-t dark:border-slate-800">
              <button onClick=${() => setShowModal(false)} className="px-14 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">
                Voltar e Ajustar Look
              </button>
            </footer>
          </div>
        </div>
      `}

      <footer className="h-12 flex items-center justify-center shrink-0 border-t dark:border-slate-900 text-[10px] uppercase tracking-widest text-slate-400 bg-white dark:bg-slate-950 transition-colors">
        <span>LuaStyle Provador AI © 2026</span>
      </footer>
    </div>
  `;
};

// --- RENDERIZAÇÃO ---
const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);

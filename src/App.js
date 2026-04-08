import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Smartphone, 
  SquareUser, 
  Wand2, 
  Loader2, 
  AlertCircle,
  Camera,
  SaveAll,
  IdCard
} from 'lucide-react';

// --- CONFIGURACIÓN DE API ---
const callGemini = async (prompt, base64Images) => {
  const apiKey = ""; // Inyectado automáticamente por el entorno
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-image:generateContent?key=${apiKey}`;

  const parts = [{ text: prompt }];
  base64Images.forEach(img => {
    const base64Data = img.split(',')[1];
    const mimeType = img.split(';')[0].split(':')[1] || "image/jpeg";
    parts.push({
      inlineData: { mimeType, data: base64Data }
    });
  });

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  let lastError;

  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Error de conexión: ${response.status}`);
      }
      const result = await response.json();
      const base64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      const mime = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.mimeType || "image/jpeg";
      if (base64) {
        return `data:${mime};base64,${base64}`;
      } else {
        throw new Error("La IA no devolvió ninguna imagen. Intenta de nuevo.");
      }
    } catch (err) {
      lastError = err;
      if (i < 4) await new Promise(r => setTimeout(r, delays[i]));
    }
  }
  throw lastError;
};

// --- UTILIDADES ---
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

const downloadImage = (base64Data, filename) => {
  const link = document.createElement('a');
  link.href = base64Data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const fetchTemplateAsBase64 = async (driveId) => {
  const directUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1500`;
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob.type && !blob.type.startsWith('image/')) continue; 
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
      });
    } catch (error) {
      console.warn(`El proxy falló: ${proxyUrl}`, error);
    }
  }
  throw new Error("No se pudo cargar la plantilla base automáticamente. Verifica que el enlace sea accesible.");
};

// --- COMPONENTES DE UI NEÓN (Optimizados para Móvil) ---
const NeonInput = ({ label, type = "text", value, onChange, placeholder }) => (
  <div className="mb-5">
    <label className="block text-xs font-bold text-cyan-400 mb-2 tracking-wider uppercase">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full bg-[#050510] border-2 border-violet-800/60 text-violet-100 rounded-xl p-4 text-base focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all placeholder-violet-800/80"
    />
  </div>
);

const NeonFileInput = ({ label, onChange, id, file, required }) => (
  <div className="mb-5">
    <label className="block text-xs font-bold text-violet-400 mb-2 tracking-wider uppercase">
      {label} {required && <span className="text-pink-500">*</span>}
    </label>
    <label htmlFor={id} className="flex flex-col items-center justify-center w-full min-h-[120px] p-4 border-2 border-dashed border-violet-600/60 rounded-xl cursor-pointer bg-violet-900/10 hover:bg-violet-900/30 active:bg-violet-900/40 hover:border-cyan-400 transition-all text-violet-300 group">
      <Upload className="mb-3 text-violet-400 group-hover:text-cyan-400 transition-colors" size={28} />
      <span className="text-sm font-semibold truncate w-full text-center px-4">
        {file ? file.name : 'Toca para subir una foto'}
      </span>
      <input type="file" id={id} className="hidden" accept="image/*" onChange={(e) => onChange(e.target.files[0])} />
    </label>
  </div>
);

const NeonButton = ({ children, onClick, loading, icon, disabled, className = "" }) => (
  <button 
    onClick={onClick} 
    disabled={loading || disabled}
    className={`w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 active:from-violet-700 active:to-fuchsia-700 text-white font-bold py-4 px-4 rounded-xl shadow-[0_4px_20px_rgba(192,38,211,0.4)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {loading ? <Loader2 className="animate-spin" size={22} /> : icon}
    {children}
  </button>
);

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [activeTab, setActiveTab] = useState('cred1');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const tabs = [
    { id: 'cred1', label: 'Credencial 1', short: 'Cred 1', icon: <IdCard size={22}/> },
    { id: 'cred2', label: 'Credencial 2', short: 'Cred 2', icon: <SquareUser size={22}/> },
    { id: 'angulo', label: 'Ángulo', short: 'Ángulo', icon: <Camera size={22}/> },
    { id: 'sim', label: 'Editor SIM', short: 'SIM', icon: <Smartphone size={22}/> },
  ];

  const idsCred1 = {
    anverso: "1WAdJGfQ0kFE_jfyYHKWNhpIIGSuLTe0l",
    reverso: "1fiI0bQyagpYEwzYCjcYgYSqmyPw29F5R"
  };
  const idsCred2 = {
    anverso: "1Sn1TH4sCVtGAQn1mtVviVDxnDfWQhhqR",
    reverso: "1rdJooQOhnnkwmDeaGj21Oi0iT9wZs0Az"
  };
  const idSim = "1vAcrkUffoZiQNwkinkveHg7FNVBPwGSH";

  // --- VISTA DE CREDENCIALES (Reutilizable) ---
  const CredencialView = ({ type, ids }) => {
    // Anverso State
    const [foto, setFoto] = useState(null);
    const [carnet, setCarnet] = useState('');
    const [resAnverso, setResAnverso] = useState(null);
    const [loadAnverso, setLoadAnverso] = useState(false);

    // Reverso State
    const [nombre, setNombre] = useState('');
    const [fecha, setFecha] = useState('');
    const [profesion, setProfesion] = useState('');
    const [domicilio, setDomicilio] = useState('');
    const [resReverso, setResReverso] = useState(null);
    const [loadReverso, setLoadReverso] = useState(false);

    const handleGenerateAnverso = async () => {
      setLoadAnverso(true);
      try {
        const tplBase64 = await fetchTemplateAsBase64(ids.anverso);
        let images = [tplBase64];
        let prompt = `Edita esta imagen de credencial manteniendo el diseño idéntico. `;
        if (carnet) prompt += `Cambia el número de carnet o documento a '${carnet}'. `;
        
        if (foto) {
          const fotoBase64 = await fileToBase64(foto);
          images.push(fotoBase64);
          prompt += `Reemplaza la foto de perfil en la primera imagen (plantilla) con la persona mostrada en la segunda imagen adjunta. `;
          
          // INSTRUCCIÓN ESPECÍFICA PARA CREDENCIAL 2 (Vista frontal tipo carnet)
          if (type === 2) {
            prompt += `¡MUY IMPORTANTE! La foto generada debe adaptarse estrictamente al formato de una FOTO DE CARNET FORMAL: la persona debe estar mirando directamente al frente (cámara), centrada y bien iluminada. PROHIBIDO AÑADIR BORDES REDONDEADOS O CONTORNOS A LA FOTO. La foto debe tener las esquinas rectas y conservar exactamente el tamaño y recuadro original de la plantilla de referencia. `;
          } else {
            prompt += `Asegúrate de mantener la misma iluminación, estilo y recuadro original de la credencial. `;
          }
        } else {
          prompt += `Mantén la foto de perfil original intacta.`;
        }

        const result = await callGemini(prompt, images);
        setResAnverso(result);
      } catch (e) {
        showToast("Error anverso: " + e.message);
      }
      setLoadAnverso(false);
    };

    const handleGenerateReverso = async () => {
      setLoadReverso(true);
      try {
        const tplBase64 = await fetchTemplateAsBase64(ids.reverso);
        let prompt = `Edita esta imagen del reverso de una credencial. Mantén todo el diseño, colores y tipografía idénticos. Modifica exactamente los siguientes datos:\n`;
        if (nombre) prompt += `- Nombre completo: ${nombre}\n`;
        if (fecha) prompt += `- Fecha de nacimiento: ${fecha}\n`;
        if (profesion) prompt += `- Profesión: ${profesion}\n`;
        if (domicilio) prompt += `- Domicilio: ${domicilio}\n`;

        const result = await callGemini(prompt, [tplBase64]);
        setResReverso(result);
      } catch (e) {
        showToast("Error reverso: " + e.message);
      }
      setLoadReverso(false);
    };

    return (
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 w-full">
        {/* PANEL ANVERSO */}
        <div className="bg-[#0b0c16] border border-cyan-900/50 rounded-[1.5rem] p-5 sm:p-6 shadow-[0_0_25px_rgba(6,182,212,0.1)] relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 mb-4 flex items-center gap-2">
            <ImageIcon size={22} className="text-cyan-400"/> Edición Anverso {type === 2 && "(Carnet Frontal)"}
          </h2>
          
          <div className="text-[11px] text-cyan-200/80 mb-5 bg-cyan-900/20 p-3 rounded-lg border border-cyan-800/40 flex items-center gap-2">
            <ImageIcon size={16} className="shrink-0" /> Plantilla precargada lista.
          </div>
          
          <NeonInput label="Número de Carnet" value={carnet} onChange={setCarnet} placeholder="Ej: 12345678" />
          <NeonFileInput label="Foto de Reemplazo (Rostro)" id={`foto-anv-${type}`} onChange={setFoto} file={foto} />
          
          <div className="mt-auto pt-4">
            <NeonButton onClick={handleGenerateAnverso} loading={loadAnverso} icon={<Wand2 size={20}/>}>
              Generar Anverso
            </NeonButton>
          </div>

          {resAnverso && (
            <div className="mt-6 p-4 bg-[#05050a] border border-cyan-800/60 rounded-2xl">
              <p className="text-sm text-cyan-300 mb-3 font-bold text-center">Resultado:</p>
              <img src={resAnverso} alt="Anverso Generado" className="w-full rounded-xl border border-cyan-900 shadow-lg" />
              <button onClick={() => downloadImage(resAnverso, `anverso_credencial_${type}.jpg`)} className="mt-4 w-full bg-cyan-900/40 hover:bg-cyan-800 active:bg-cyan-700 text-cyan-300 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Download size={20} /> Guardar Imagen
              </button>
            </div>
          )}
        </div>

        {/* PANEL REVERSO */}
        <div className="bg-[#0b0c16] border border-fuchsia-900/50 rounded-[1.5rem] p-5 sm:p-6 shadow-[0_0_25px_rgba(192,38,211,0.1)] relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-fuchsia-400 to-pink-600"></div>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-pink-400 mb-4 flex items-center gap-2">
            <ImageIcon size={22} className="text-fuchsia-400"/> Edición Reverso
          </h2>

          <div className="text-[11px] text-fuchsia-200/80 mb-5 bg-fuchsia-900/20 p-3 rounded-lg border border-fuchsia-800/40 flex items-center gap-2">
            <ImageIcon size={16} className="shrink-0" /> Plantilla precargada lista.
          </div>
          
          <NeonInput label="Nombre Completo" value={nombre} onChange={setNombre} placeholder="Ej: Juan Pérez" />
          <NeonInput label="Fecha de Nacimiento" value={fecha} onChange={setFecha} placeholder="Ej: 15/08/1990" />
          <NeonInput label="Profesión" value={profesion} onChange={setProfesion} placeholder="Ej: Ingeniero" />
          <NeonInput label="Domicilio" value={domicilio} onChange={setDomicilio} placeholder="Ej: Av. Principal 123" />
          
          <div className="mt-auto pt-4">
            <NeonButton onClick={handleGenerateReverso} loading={loadReverso} icon={<Wand2 size={20}/>} className="!from-fuchsia-600 !to-pink-600 active:!from-fuchsia-700 active:!to-pink-700 shadow-[0_4px_20px_rgba(236,72,153,0.4)]">
              Generar Reverso
            </NeonButton>
          </div>

          {resReverso && (
            <div className="mt-6 p-4 bg-[#05050a] border border-fuchsia-800/60 rounded-2xl">
              <p className="text-sm text-fuchsia-300 mb-3 font-bold text-center">Resultado:</p>
              <img src={resReverso} alt="Reverso Generado" className="w-full rounded-xl border border-fuchsia-900 shadow-lg" />
              <button onClick={() => downloadImage(resReverso, `reverso_credencial_${type}.jpg`)} className="mt-4 w-full bg-fuchsia-900/40 hover:bg-fuchsia-800 active:bg-fuchsia-700 text-fuchsia-300 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Download size={20} /> Guardar Imagen
              </button>
            </div>
          )}
        </div>

        {/* DESCARGA DOBLE */}
        {resAnverso && resReverso && (
          <div className="lg:col-span-2 flex justify-center mt-2 mb-6">
             <button onClick={() => {
                downloadImage(resAnverso, `anverso_credencial_${type}.jpg`);
                setTimeout(() => downloadImage(resReverso, `reverso_credencial_${type}.jpg`), 500);
             }} className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 active:from-emerald-600 active:to-teal-600 text-white font-bold py-4 px-8 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3 transition-transform active:scale-95">
               <SaveAll size={24} /> Descargar Ambas Partes
             </button>
          </div>
        )}
      </div>
    );
  };

  // --- VISTA CAMBIO ÁNGULO ---
  const AnguloView = () => {
    const [producto, setProducto] = useState(null);
    const [res1, setRes1] = useState(null);
    const [res2, setRes2] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleGenerateAngles = async () => {
      if (!producto) return showToast("Sube una imagen de producto primero.");
      setLoading(true);
      try {
        const base64 = await fileToBase64(producto);
        const p1 = "Analiza esta fotografía de producto. Genera la misma imagen manteniendo la iluminación y el fondo, pero altera ligeramente el ángulo de cámara moviéndolo un poco hacia la izquierda.";
        const p2 = "Analiza esta fotografía de producto. Genera la misma imagen manteniendo la iluminación y el fondo, pero altera ligeramente el ángulo de cámara moviéndolo un poco hacia la derecha.";
        
        const img1 = await callGemini(p1, [base64]);
        setRes1(img1);
        const img2 = await callGemini(p2, [base64]);
        setRes2(img2);
      } catch (e) {
        showToast("Error ángulos: " + e.message);
      }
      setLoading(false);
    };

    return (
      <div className="w-full max-w-2xl mx-auto bg-[#0b0c16] border border-indigo-900/50 rounded-[1.5rem] p-5 sm:p-8 shadow-[0_0_25px_rgba(99,102,241,0.1)] relative overflow-hidden flex flex-col">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-600"></div>
        <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 mb-4 flex items-center gap-2">
          <Camera size={24} className="text-indigo-400"/> Ángulos de Producto
        </h2>
        
        <p className="text-sm text-indigo-200/80 mb-6 leading-relaxed">Sube la foto de un producto y la IA generará 2 tomas adicionales con leves cambios de perspectiva izquierda/derecha.</p>
        
        <NeonFileInput label="Foto del Producto" id="prod-img" onChange={setProducto} file={producto} required />
        
        <NeonButton onClick={handleGenerateAngles} loading={loading} icon={<Wand2 size={20}/>} className="mt-4 !from-indigo-600 !to-purple-600 shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
          Generar Nuevos Ángulos
        </NeonButton>

        {(res1 || res2) && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {res1 && (
              <div className="flex flex-col gap-3 bg-[#05050a] p-4 rounded-2xl border border-indigo-900/50">
                 <p className="text-sm text-indigo-300 text-center font-bold">Ángulo 1 (Izquierda)</p>
                 <img src={res1} alt="Ángulo 1" className="w-full rounded-xl shadow-md" />
                 <button onClick={() => downloadImage(res1, "producto_angulo_1.jpg")} className="w-full bg-indigo-900/40 active:bg-indigo-800 text-indigo-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                   <Download size={18} /> Descargar
                 </button>
              </div>
            )}
            {res2 && (
              <div className="flex flex-col gap-3 bg-[#05050a] p-4 rounded-2xl border border-purple-900/50">
                 <p className="text-sm text-purple-300 text-center font-bold">Ángulo 2 (Derecha)</p>
                 <img src={res2} alt="Ángulo 2" className="w-full rounded-xl shadow-md" />
                 <button onClick={() => downloadImage(res2, "producto_angulo_2.jpg")} className="w-full bg-purple-900/40 active:bg-purple-800 text-purple-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                   <Download size={18} /> Descargar
                 </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- VISTA CAPTURA SIM ---
  const SimView = () => {
    const [hora, setHora] = useState('');
    const [telefono, setTelefono] = useState('');
    const [resSim, setResSim] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleGenerateSim = async () => {
      if (!hora && !telefono) return showToast("Ingresa hora o teléfono.");
      setLoading(true);
      try {
        const base64 = await fetchTemplateAsBase64(idSim);
        let prompt = `Edita esta captura de pantalla de teléfono móvil. Mantén toda la interfaz gráfica y fondos idénticos.\n`;
        if (hora) prompt += `Cambia el texto de la hora por '${hora}'.\n`;
        if (telefono) prompt += `Cambia el número de teléfono visible por '${telefono}'.`;

        const result = await callGemini(prompt, [base64]);
        setResSim(result);
      } catch (e) {
        showToast("Error en edición SIM: " + e.message);
      }
      setLoading(false);
    };

    return (
      <div className="w-full max-w-md mx-auto bg-[#0b0c16] border border-emerald-900/50 rounded-[1.5rem] p-5 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.1)] relative overflow-hidden flex flex-col">
         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-600"></div>
         <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400 mb-4 flex items-center gap-2">
          <Smartphone size={24} className="text-emerald-400"/> Edición SIM
         </h2>

         <div className="text-[11px] text-emerald-200/80 mb-6 bg-emerald-900/20 p-3 rounded-lg border border-emerald-800/40 flex items-center gap-2">
            <ImageIcon size={16} className="shrink-0" /> Captura base cargada.
         </div>
         
         <NeonInput label="Nueva Hora" value={hora} onChange={setHora} placeholder="Ej: 14:35" />
         <NeonInput label="Nuevo Teléfono" value={telefono} onChange={setTelefono} placeholder="Ej: +591 71234567" />
         
         <div className="mt-2">
           <NeonButton onClick={handleGenerateSim} loading={loading} icon={<Wand2 size={20}/>} className="!from-emerald-600 !to-teal-600 shadow-[0_4px_20px_rgba(16,185,129,0.4)]">
            Generar Captura
           </NeonButton>
         </div>

         {resSim && (
            <div className="mt-8 p-5 bg-[#05050a] border border-emerald-800/60 rounded-2xl flex flex-col items-center">
              <p className="text-sm text-emerald-300 mb-4 font-bold text-center">Resultado Generado</p>
              <img src={resSim} alt="SIM Generada" className="w-full rounded-xl border border-emerald-900 shadow-lg max-w-[280px]" />
              <button onClick={() => downloadImage(resSim, "captura_sim_modificada.jpg")} className="mt-6 w-full bg-emerald-900/40 active:bg-emerald-800 text-emerald-300 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Download size={20} /> Guardar Captura
              </button>
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-white font-sans selection:bg-cyan-500 selection:text-black flex flex-col">
      
      {/* HEADER TOP (Fijo) */}
      <header className="border-b border-violet-900/30 bg-black/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                <Wand2 size={22} className="text-white" />
             </div>
             <h1 className="text-xl sm:text-2xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400">
                CENAQUINA<span className="font-light">PARIENTE</span> AI
             </h1>
          </div>
          
          {/* TABS DE NAVEGACIÓN DESKTOP (Ocultos en móvil) */}
          <div className="hidden md:flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                  ? 'bg-violet-600/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                  : 'bg-transparent text-violet-300 border border-transparent hover:bg-violet-900/30 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL (Padding bottom extra para la barra de navegación móvil) */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pt-6 pb-28 md:pb-10 md:p-8">
        {activeTab === 'cred1' && <CredencialView type={1} ids={idsCred1} />}
        {activeTab === 'cred2' && <CredencialView type={2} ids={idsCred2} />}
        {activeTab === 'angulo' && <AnguloView />}
        {activeTab === 'sim' && <SimView />}
      </main>

      {/* BOTTOM NAVIGATION BAR PARA MÓVILES */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#050510]/90 backdrop-blur-2xl border-t border-violet-900/40 z-50 px-2 py-2 pb-safe flex justify-around items-center">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-2 min-w-[72px] rounded-xl transition-all ${
                isActive 
                ? 'text-cyan-400' 
                : 'text-violet-400/70 hover:text-violet-300'
              }`}
            >
              <div className={`mb-1 p-1.5 rounded-full transition-colors ${isActive ? 'bg-cyan-500/20' : 'bg-transparent'}`}>
                {React.cloneElement(tab.icon, { size: isActive ? 24 : 22 })}
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.short}
              </span>
            </button>
          )
        })}
      </nav>

      {/* TOAST DE NOTIFICACIONES */}
      {toast && (
        <div className="fixed top-20 sm:top-auto sm:bottom-6 sm:right-6 left-4 right-4 sm:left-auto bg-rose-950/90 backdrop-blur-md border-2 border-rose-600 text-rose-100 px-5 py-4 rounded-2xl shadow-[0_10px_30px_rgba(244,63,94,0.4)] z-50 flex items-center gap-3 font-semibold animate-in slide-in-from-top-4 sm:slide-in-from-bottom-4">
           <AlertCircle size={24} className="text-rose-500 shrink-0" />
           <p className="text-sm leading-tight">{toast}</p>
        </div>
      )}
    </div>
  );
}
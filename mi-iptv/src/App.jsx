import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Users, Settings, LogOut, Plus, Edit, Trash2, 
  Tv, MonitorPlay, AlertCircle, Search, Menu, X, Save
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, 
  deleteDoc, onSnapshot 
} from 'firebase/firestore';

/**
 * CONFIGURACIÓN DE FIREBASE
 * Reemplaza los valores de abajo con tus credenciales de Firebase Console
 * para que la base de datos de usuarios funcione correctamente.
 */
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'mi-app-iptv-personal';

// Función para cargar dinámicamente HLS.js para soporte de video m3u8
const loadHlsScript = () => {
  if (!document.getElementById('hls-script')) {
    const script = document.createElement('script');
    script.id = 'hls-script';
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    document.body.appendChild(script);
  }
};

// --- COMPONENTE PRINCIPAL (RUTEADOR) ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [view, setView] = useState('LOGIN'); // LOGIN, ADMIN, PLAYER
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHlsScript();
    
    // Autenticación obligatoria para usar Firestore
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // Intentar usar token personalizado si existe
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Error en Auth:", e);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <MonitorPlay className="w-12 h-12 text-blue-500 mb-4" />
          <div className="h-1 w-32 bg-gray-800 rounded overflow-hidden">
            <div className="h-full bg-blue-500 animate-progress w-full origin-left"></div>
          </div>
        </div>
      </div>
    );
  }

  // Lógica de navegación
  if (view === 'LOGIN') {
    return <LoginView setView={setView} setCurrentUser={setCurrentUser} firebaseUser={firebaseUser} />;
  }

  if (view === 'ADMIN') {
    return <AdminDashboard setView={setView} firebaseUser={firebaseUser} />;
  }

  return <PlayerView user={currentUser} setView={setView} />;
}

// --- VISTA DE LOGIN ---
function LoginView({ setView, setCurrentUser, firebaseUser }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbUsers, setDbUsers] = useState([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubscribe = onSnapshot(q, (snap) => {
      setDbUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [firebaseUser]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      // Credenciales Maestro
      if (user === 'admin' && pass === 'admin') {
        setView('ADMIN');
        setIsSubmitting(false);
        return;
      }

      // Buscar cliente en DB
      const client = dbUsers.find(u => u.username === user && u.password === pass);
      if (client) {
        if (client.status === 'inactive') {
          setError('Tu cuenta está suspendida.');
        } else {
          setCurrentUser(client);
          setView('PLAYER');
        }
      } else {
        setError('Usuario o clave incorrectos.');
      }
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 mb-4">
            <Tv className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">IPTV Login</h1>
          <p className="text-gray-500 text-sm">Gestiona y reproduce tus listas</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-400 text-sm rounded-xl flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Usuario</label>
            <input 
              type="text" 
              className="w-full bg-black border border-gray-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-all"
              placeholder="Ingresa tu usuario"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full bg-black border border-gray-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-600/10 transition-all flex items-center justify-center"
          >
            {isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
      <p className="mt-8 text-gray-700 text-xs">Acceso Admin: admin / admin</p>
    </div>
  );
}

// --- DASHBOARD ADMIN ---
function AdminDashboard({ setView, firebaseUser }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [passLogin, setPassLogin] = useState('');
  const [m3uData, setM3uData] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (!firebaseUser) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [firebaseUser]);

  const openAdd = () => {
    setEditId(null);
    setName(''); setUserLogin(''); setPassLogin(''); setM3uData(''); setStatus('active');
    setModal(true);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setName(u.name); setUserLogin(u.username); setPassLogin(u.password); setM3uData(u.m3uData || ''); setStatus(u.status || 'active');
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const data = { name, username: userLogin, password: passLogin, m3uData, status, updatedAt: new Date().toISOString() };

    try {
      if (editId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editId), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...data, createdAt: new Date().toISOString() });
      }
      setModal(false);
    } catch (e) {
      alert("Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="p-4 border-b border-gray-900 bg-gray-950 flex justify-between items-center">
        <div className="flex items-center text-blue-500 font-bold"><Users className="mr-2" /> Panel Admin</div>
        <button onClick={() => setView('LOGIN')} className="text-gray-400 hover:text-white flex items-center text-sm">
          <LogOut className="w-4 h-4 mr-2" /> Salir
        </button>
      </nav>

      <div className="p-6 flex-1 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Mis Clientes</h2>
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl flex items-center text-sm font-bold transition-all">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-950 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Credenciales</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/30">
                  <td className="p-4 font-bold">{u.name}</td>
                  <td className="p-4">
                    <div className="text-xs text-blue-400 font-mono">{u.username}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{u.password}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${u.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {u.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openEdit(u)} className="p-2 bg-gray-800 rounded hover:bg-blue-600 transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(u.id)} className="p-2 bg-gray-800 rounded hover:bg-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editId ? 'Editar Cliente' : 'Crear Cliente'}</h3>
              <button onClick={() => setModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-500 font-bold mb-1 block">Nombre</label>
                <input type="text" className="w-full bg-black border border-gray-800 rounded-xl p-3" value={name} onChange={e=>setName(e.target.value)} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-500 font-bold mb-1 block">Estado</label>
                <select className="w-full bg-black border border-gray-800 rounded-xl p-3" value={status} onChange={e=>setStatus(e.target.value)}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-500 font-bold mb-1 block">Usuario Login</label>
                <input type="text" className="w-full bg-black border border-gray-800 rounded-xl p-3" value={userLogin} onChange={e=>setUserLogin(e.target.value)} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-500 font-bold mb-1 block">Contraseña Login</label>
                <input type="text" className="w-full bg-black border border-gray-800 rounded-xl p-3" value={passLogin} onChange={e=>setPassLogin(e.target.value)} required />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-bold mb-1 block">Contenido Lista M3U (Texto)</label>
                <textarea 
                  className="w-full bg-black border border-gray-800 rounded-xl p-3 h-40 font-mono text-xs text-blue-300"
                  value={m3uData}
                  onChange={e=>setM3uData(e.target.value)}
                  placeholder="#EXTM3U&#10;#EXTINF:-1,Nombre Canal&#10;http://link.com/video.m3u8"
                ></textarea>
              </div>
              <button type="submit" className="col-span-2 bg-blue-600 py-4 rounded-xl font-bold flex items-center justify-center">
                <Save className="w-5 h-5 mr-2" /> GUARDAR CLIENTE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTA REPRODUCTOR ---
function PlayerView({ user, setView }) {
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sidebar, setSidebar] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user?.m3uData) return;
    const lines = user.m3uData.split('\n');
    const parsed = [];
    let cur = null;

    lines.forEach(l => {
      const line = l.trim();
      if (!line) return;
      if (line.startsWith('#EXTINF:')) {
        cur = { name: 'Canal', logo: null };
        const namePart = line.split(',').pop();
        if (namePart) cur.name = namePart;
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        if (logoMatch) cur.logo = logoMatch[1];
      } else if (!line.startsWith('#')) {
        if (cur) {
          cur.url = line;
          parsed.push(cur);
          cur = null;
        }
      }
    });
    setChannels(parsed);
    if (parsed.length > 0 && window.innerWidth > 768) setSelected(parsed[0]);
  }, [user]);

  const filtered = channels.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Sidebar de canales */}
      <div className={`
        fixed md:relative z-40 inset-y-0 left-0 w-72 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform
        ${sidebar ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center text-blue-500 font-bold"><Tv className="mr-2" /> Player</div>
          <button onClick={() => setView('LOGIN')} className="text-gray-500"><LogOut size={18} /></button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-600" size={14} />
            <input 
              type="text" className="w-full bg-black border border-gray-800 rounded-lg pl-9 py-2 text-xs" 
              placeholder="Buscar canal..." value={query} onChange={e=>setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-black p-2 space-y-1">
          {filtered.map((c, i) => (
            <button 
              key={i} 
              onClick={() => { setSelected(c); if(window.innerWidth < 768) setSidebar(false); }}
              className={`w-full p-2 flex items-center rounded-lg text-left transition-all ${selected?.url === c.url ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-900'}`}
            >
              <div className="w-10 h-10 rounded bg-gray-800 flex-shrink-0 flex items-center justify-center overflow-hidden mr-3">
                {c.logo ? <img src={c.logo} className="w-full h-full object-contain" /> : <Play size={12} />}
              </div>
              <span className="text-xs font-medium truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pantalla de video */}
      <div className="flex-1 flex flex-col relative bg-black">
        <header className="absolute top-0 w-full p-4 z-30 flex items-center">
          <button onClick={() => setSidebar(!sidebar)} className="md:hidden p-2 bg-black/60 rounded-full text-white mr-4"><Menu /></button>
          <div className="text-white font-bold text-shadow">{selected?.name || 'IPTV Pro'}</div>
        </header>

        <div className="flex-1 flex items-center justify-center">
          {selected ? (
            <VideoPlayer url={selected.url} />
          ) : (
            <div className="text-center">
              <MonitorPlay className="w-16 h-16 text-gray-800 mx-auto mb-4" />
              <p className="text-gray-600">Selecciona un canal</p>
            </div>
          )}
        </div>
      </div>
      <style>{`.text-shadow { text-shadow: 0 2px 4px rgba(0,0,0,0.8); } @keyframes progress { from { transform: scaleX(0); } to { transform: scaleX(1); } } .animate-progress { animation: progress 2s infinite ease-in-out; }`}</style>
    </div>
  );
}

function VideoPlayer({ url }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    let hls = null;
    if (url.includes('.m3u8')) {
      if (window.Hls && window.Hls.isSupported()) {
        hls = new window.Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      }
    } else {
      video.src = url;
    }
    return () => { if (hls) hls.destroy(); };
  }, [url]);

  return <video ref={videoRef} controls autoPlay className="w-full h-full object-contain bg-black" />;
}
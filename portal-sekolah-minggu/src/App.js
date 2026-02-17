/* eslint-disable no-undef */
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Users, 
  Camera, 
  PlusCircle, 
  LogOut, 
  Star,
  Sun,
  Zap,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Trash2,
  FileText,
  X
} from 'lucide-react';

// Konfigurasi Firebase - Perbaikan untuk Local Environment
const getFirebaseConfig = () => {
  try {
    // Mengecek apakah variabel config dari Canvas tersedia, jika tidak pakai template kosong
    return typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
      apiKey: "MASUKKAN_API_KEY_ANDA",
      authDomain: "PROJECT_ANDA.firebaseapp.com",
      projectId: "PROJECT_ANDA",
      storageBucket: "PROJECT_ANDA.appspot.com",
      messagingSenderId: "ID_ANDA",
      appId: "APP_ID_ANDA"
    };
  } catch (e) {
    return {};
  }
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'portal-sekolah-minggu-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState('login'); 
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [members, setMembers] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectedChild, setDetectedChild] = useState(null);
  const [editingMember, setEditingMember] = useState(null); 
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [memberForm, setMemberForm] = useState({
    nama: '',
    tanggalLahir: '',
    usia: '',
    kelasSekolah: '',
    kategori: 'Bintang',
    foto: ''
  });

  const defaultAvatar = "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=150&h=150&fit=crop";

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !authReady) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'members');
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(docs);
      }, 
      (error) => console.error("Firestore Error:", error)
    );
    return () => unsubscribe();
  }, [user, authReady]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (authData.username === 'admin' && authData.password === '12345') {
      setView('dashboard');
    } else {
      alert("Gunakan Username: admin dan Password: 12345");
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!memberForm.foto) {
      alert("Mohon ambil foto profil terlebih dahulu!");
      return;
    }
    
    try {
      if (editingMember) {
        const memberRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', editingMember.id);
        await updateDoc(memberRef, { ...memberForm });
        alert("Data berhasil diperbarui!");
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), {
          ...memberForm,
          createdAt: Timestamp.now(),
          absensi: [] 
        });
        alert("Anggota berhasil ditambahkan!");
      }
      
      setEditingMember(null);
      setView('dashboard');
      setMemberForm({ nama: '', tanggalLahir: '', usia: '', kelasSekolah: '', kategori: 'Bintang', foto: '' });
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data.");
    }
  };

  const startEdit = (member) => {
    setEditingMember(member);
    setMemberForm({
      nama: member.nama,
      tanggalLahir: member.tanggalLahir,
      usia: member.usia,
      kelasSekolah: member.kelasSekolah,
      kategori: member.kategori,
      foto: member.foto
    });
    setView('register');
  };

  const deleteMember = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data anggota ini?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id));
        alert("Data berhasil dihapus");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setMemberForm({ ...memberForm, foto: dataUrl });
      stopCamera();
    }
  };

  const startCamera = async (forAttendance = true) => {
    setCameraActive(true);
    if (forAttendance) setDetectedChild(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Kamera tidak dapat diakses.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const processAttendance = async () => {
    if (members.length === 0) {
      alert("Belum ada data anggota.");
      return;
    }
    const randomIdx = Math.floor(Math.random() * members.length);
    const child = members[randomIdx];
    const today = new Date().toISOString().split('T')[0];

    if (child.absensi && child.absensi.includes(today)) {
      alert(`${child.nama} sudah melakukan absensi hari ini!`);
    } else {
      setDetectedChild(child);
      try {
        const memberRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', child.id);
        await updateDoc(memberRef, {
          absensi: [...(child.absensi || []), today]
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const categories = [
    { name: 'Bintang', age: '0 - Kls 3 SD', icon: <Star className="text-yellow-500" /> },
    { name: 'Cahaya', age: 'Kls 4 - 6 SD', icon: <Sun className="text-orange-500" /> },
    { name: 'Pra Remaja', age: 'Kls 1 - 3 SMP', icon: <Zap className="text-blue-500" /> },
  ];

  const countMonthlyAttendance = (absensiArray) => {
    if (!absensiArray) return 0;
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    return absensiArray.filter(dateStr => {
      const d = new Date(dateStr);
      return d >= thirtyDaysAgo;
    }).length;
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4 font-sans text-gray-900">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={40} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Portal Sekolah Minggu</h1>
          <form onSubmit={handleLogin} className="space-y-4 mt-8 text-left">
            <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="admin" value={authData.username} onChange={(e) => setAuthData({...authData, username: e.target.value})} />
            <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="12345" value={authData.password} onChange={(e) => setAuthData({...authData, password: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-gray-900">
      <canvas ref={canvasRef} className="hidden" />
      
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h2 className="font-bold text-blue-600 text-lg flex items-center gap-2"><Users size={20}/> Portal SM</h2>
          <button onClick={() => { stopCamera(); setView('login'); }} className="text-red-500 p-2"><LogOut size={20} /></button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Users size={16}/> },
            { id: 'register', label: editingMember ? 'Edit Data' : 'Daftar', icon: <PlusCircle size={16}/> },
            { id: 'attendance', label: 'Absen', icon: <Camera size={16}/> },
            { id: 'report', label: 'Rekap', icon: <FileText size={16}/> }
          ].map((v) => (
            <button 
              key={v.id} 
              onClick={() => { 
                stopCamera(); 
                setView(v.id); 
                if(v.id==='attendance') startCamera(); 
                if(v.id !== 'register') setEditingMember(null);
              }} 
              className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${view === v.id ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
            >
              {v.icon} <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {view === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in">
            {categories.map((cat) => (
              <div key={cat.name} onClick={() => { setSelectedClass(cat.name); setView('classDetail'); }} className="bg-white p-6 rounded-3xl shadow-sm border hover:border-blue-300 cursor-pointer transition">
                <div className="flex justify-between mb-4">
                  <div className="p-3 bg-gray-50 rounded-2xl">{cat.icon}</div>
                  <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg">{members.filter(m => m.kategori === cat.name).length} Anak</span>
                </div>
                <h3 className="text-xl font-bold">{cat.name}</h3>
                <p className="text-sm text-gray-500">{cat.age}</p>
              </div>
            ))}
          </div>
        )}

        {view === 'register' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingMember ? <Edit2 className="text-blue-600" /> : <PlusCircle className="text-blue-600" />} 
                {editingMember ? 'Edit Anggota' : 'Pendaftaran Anggota'}
              </h2>
              {editingMember && (
                <button onClick={() => { setEditingMember(null); setView('dashboard'); }} className="text-gray-400 p-2"><X /></button>
              )}
            </div>
            <form onSubmit={handleSaveMember} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input required type="text" className="w-full p-3 bg-gray-50 rounded-xl" placeholder="Nama Lengkap" value={memberForm.nama} onChange={(e)=>setMemberForm({...memberForm, nama: e.target.value})} />
                <input required type="date" className="w-full p-3 bg-gray-50 rounded-xl" value={memberForm.tanggalLahir} onChange={(e)=>setMemberForm({...memberForm, tanggalLahir: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input required type="number" className="w-full p-3 bg-gray-50 rounded-xl" placeholder="Usia" value={memberForm.usia} onChange={(e)=>setMemberForm({...memberForm, usia: e.target.value})} />
                  <input required type="text" className="w-full p-3 bg-gray-50 rounded-xl" placeholder="Kelas Sekolah" value={memberForm.kelasSekolah} onChange={(e)=>setMemberForm({...memberForm, kelasSekolah: e.target.value})} />
                </div>
                <select className="w-full p-3 bg-gray-50 rounded-xl" value={memberForm.kategori} onChange={(e)=>setMemberForm({...memberForm, kategori: e.target.value})}>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-4 flex flex-col items-center text-center">
                <div className="w-full aspect-square max-w-[180px] bg-gray-100 rounded-3xl overflow-hidden relative border-2 border-dashed border-gray-300">
                  {cameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={memberForm.foto || defaultAvatar} alt="Profil Preview" className="w-full h-full object-cover" />
                  )}
                </div>
                
                {cameraActive ? (
                  <button type="button" onClick={capturePhoto} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <Camera size={20} /> Ambil Foto
                  </button>
                ) : (
                  <button type="button" onClick={() => startCamera(false)} className="w-full bg-blue-100 text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <RefreshCw size={20} /> {memberForm.foto ? 'Ganti Foto' : 'Mulai Kamera'}
                  </button>
                )}
                
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg mt-auto">
                  {editingMember ? 'Perbarui Data' : 'Simpan Anggota'}
                </button>
              </div>
            </form>
          </div>
        )}

        {view === 'classDetail' && (
          <div className="space-y-4 animate-in fade-in">
            <button onClick={() => setView('dashboard')} className="text-blue-600 font-medium">← Kembali</button>
            <h2 className="text-xl font-bold">Kelas {selectedClass}</h2>
            {members.filter(m => m.kategori === selectedClass).map(member => (
              <div key={member.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 group">
                <img src={member.foto} alt={member.nama} className="w-14 h-14 rounded-xl object-cover" />
                <div className="flex-1">
                  <h4 className="font-bold">{member.nama}</h4>
                  <p className="text-xs text-gray-500">{member.usia} thn • {member.kelasSekolah}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(member)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => deleteMember(member.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'attendance' && (
          <div className="space-y-6 animate-in zoom-in-95">
            <div className="bg-black rounded-3xl overflow-hidden relative aspect-video shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-blue-400/50 rounded-3xl animate-pulse relative">
                   <div className="w-full h-0.5 bg-blue-400 absolute top-1/2 shadow-[0_0_15px_blue] animate-bounce" />
                </div>
              </div>
            </div>
            <button onClick={processAttendance} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 text-lg">
              <ShieldCheck /> Jalankan Scan Wajah
            </button>
            {detectedChild && (
              <div className="bg-green-50 border-2 border-green-200 p-6 rounded-3xl flex items-center gap-4 animate-in bounce-in">
                <img src={detectedChild.foto} alt="Terdeteksi" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-green-200" />
                <div>
                  <h3 className="text-green-800 font-bold text-lg">Berhasil Absen!</h3>
                  <p className="text-green-700 font-medium">{detectedChild.nama}</p>
                  <p className="text-xs text-green-600">{detectedChild.kategori}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'report' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border animate-in fade-in">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="text-blue-600" /> Rekap Kehadiran (30 Hari Terakhir)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs text-gray-400 uppercase font-bold">
                    <th className="py-3 px-2">Anak</th>
                    <th className="py-3 px-2">Kelas</th>
                    <th className="py-3 px-2 text-center">Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {members.sort((a,b) => a.kategori.localeCompare(b.kategori)).map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2 flex items-center gap-2">
                        <img src={m.foto} alt={m.nama} className="w-8 h-8 rounded-lg object-cover" />
                        <span className="font-medium">{m.nama}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 text-xs">{m.kategori}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">
                          {countMonthlyAttendance(m.absensi)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length === 0 && (
                <div className="text-center py-10 text-gray-400">Belum ada data anggota</div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="text-center py-4 text-[10px] text-gray-400">
        Portal Sekolah Minggu • Sinkronisasi Cloud Aktif
      </footer>
    </div>
  );
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDQ9x5ZcbDJGm5DDt1fGn3hb15MTG5jtpM",
  authDomain: "sorteo-apertura.firebaseapp.com",
  projectId: "sorteo-apertura",
  storageBucket: "sorteo-apertura.firebasestorage.app",
  messagingSenderId: "744664729299",
  appId: "1:744664729299:web:a3580c87d7e4325bc9b626"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const COLLECTION_NAME = "sorteo_apertura";
const container = document.getElementById("app");

// ===============================
// 🛠 UTILIDADES: MODALES Y LOADERS
// ===============================

// Modal Personalizado
const customModal = (titulo, mensaje, tipo = 'confirm') => {
    return new Promise((resolve) => {
        const modalHtml = `
            <div id="alertModal" class="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-mqb-dark/80 backdrop-blur-sm animate-fade-in">
                <div class="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
                    <div class="text-4xl text-mqb-blue">
                        ${tipo === 'error' ? '⚠️' : '🍔'}
                    </div>
                    <div>
                        <h3 class="font-impact text-3xl text-mqb-blue uppercase italic leading-none">${titulo}</h3>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2">${mensaje}</p>
                    </div>
                    <div class="flex gap-3">
                        ${tipo === 'confirm' ? `
                            <button id="modalCancel" class="flex-1 bg-gray-100 text-gray-400 p-4 rounded-xl font-impact text-xl uppercase italic">No</button>
                        ` : ''}
                        <button id="modalConfirm" class="flex-1 bg-mqb-blue text-white p-4 rounded-xl font-impact text-xl uppercase italic shadow-lg shadow-mqb-blue/20">
                            ${tipo === 'confirm' ? 'Sí, Dale' : 'Entendido'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const close = (res) => {
            document.getElementById('alertModal').remove();
            resolve(res);
        };

        document.getElementById('modalConfirm').onclick = () => close(true);
        if(tipo === 'confirm') document.getElementById('modalCancel').onclick = () => close(false);
    });
};

const getLoader = () => `<div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>`;

// ===============================
// 🔐 LOGIN
// ===============================
function renderLogin() {
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4">
      <div class="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 text-center space-y-8 animate-fade-in">
        <img src="https://imagedelivery.net/ut8GNCA1obOu4JnXrJ_J9Q/e7b59903-06e0-48f8-1bb1-71bd6da8a800/public" class="w-20 mx-auto">
        <h2 class="font-impact text-4xl text-mqb-blue uppercase italic">Admin Login</h2>
        <div class="space-y-4">
          <input id="email" type="email" placeholder="EMAIL" class="w-full p-4 rounded-2xl bg-gray-50 border-transparent focus:ring-4 focus:ring-mqb-blue/5 outline-none font-bold text-sm">
          <input id="password" type="password" placeholder="PASSWORD" class="w-full p-4 rounded-2xl bg-gray-50 border-transparent focus:ring-4 focus:ring-mqb-blue/5 outline-none font-bold text-sm">
          <button id="loginBtn" class="w-full bg-mqb-blue text-white p-5 rounded-2xl font-impact text-2xl uppercase italic tracking-widest shadow-lg transform active:scale-95 transition-all">
            Ingresar
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("loginBtn").addEventListener("click", async (e) => {
    const btn = e.target;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerHTML = `${getLoader()} Ingresando...`;

    try {
      await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value);
    } catch (error) {
      btn.disabled = false;
      btn.innerText = originalText;
      customModal("Error", "Credenciales incorrectas", "error");
    }
  });
}

// ===============================
// 📊 DASHBOARD
// ===============================
async function renderDashboard() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
  const snapshot = await getDocs(q);
  const total = snapshot.size;

  container.innerHTML = `
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <h1 class="font-impact text-2xl uppercase italic">Registro de  <span class="text-mqb-blue">fotos</span></h1>
        </div>
        <button id="logout" class="text-[10px] font-black uppercase text-gray-300 hover:text-red-500 transition-all tracking-widest">Salir</button>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-mqb-blue p-8 rounded-[2.5rem] shadow-xl text-white col-span-1">
                <p class="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 italic">Participantes</p>
                <p class="font-impact text-6xl italic leading-none">${total}</p>
            </div>
            <div class="col-span-1 md:col-span-2 flex flex-wrap gap-4 items-center justify-end">
                <button id="verifyAll" class="bg-blue-50 text-mqb-blue px-6 py-4 rounded-2xl font-impact text-xl uppercase italic hover:bg-mqb-blue hover:text-white transition-all">
                    <i class="fa-solid fa-check-double mr-2"></i> Verificar Todos los Pendientes
                </button>
                <button id="randomWinner" class="bg-yellow-500 text-white px-6 py-4 rounded-2xl font-impact text-xl uppercase italic hover:bg-mqb-dark transition-all transform active:scale-95">
                    <i class="fa-solid fa-dice mr-2"></i> Elegir Ganador Random
                </button>
            </div>
        </div>

        <div class="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest italic border-b border-gray-100">
                        <tr>
                            <th class="p-6">Evidencia</th>
                            <th class="p-6">Participante</th>
                            <th class="p-6">Contacto</th>
                            <th class="p-6 text-center">Estado</th>
                            <th class="p-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tablaBody"></tbody>
                </table>
            </div>
        </div>
    </main>

    <div id="photoModal" class="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-mqb-dark/95 backdrop-blur-md animate-fade-in" onclick="this.classList.add('hidden')">
        <img id="fullPhoto" src="" class="max-w-full max-h-full rounded-3xl shadow-2xl object-contain border-4 border-white/10">
    </div>
  `;

  const tbody = document.getElementById("tablaBody");
  const participantes = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    participantes.push({ id, ...data });

    const row = document.createElement("tr");
    row.className = `border-b border-gray-50 transition-colors ${data.ganador ? 'bg-yellow-50' : ''}`;
    row.innerHTML = `
      <td class="p-6">
        <button onclick="openPhoto('${data.fotoURL}')" class="block w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform cursor-zoom-in">
          <img src="${data.fotoURL}" class="w-full h-full object-cover">
        </button>
      </td>
      <td class="p-6">
        <p class="font-bold text-mqb-dark uppercase text-sm italic">${data.nombre}</p>
        <p class="text-[10px] text-mqb-blue font-black tracking-widest italic">@${data.instagram}</p>
      </td>
      <td class="p-6 font-bold text-xs text-green-600">
        <a href="https://wa.me/${data.telefono.replace(/\D/g,'')}" target="_blank">
            <i class="fa-brands fa-whatsapp text-lg mr-1"></i> ${data.telefono}
        </a>
      </td>
      <td class="p-6 text-center">
        ${data.ganador ? '<span class="bg-yellow-100 text-yellow-700 text-[10px] font-black px-3 py-1 rounded-full italic uppercase">🏆 GANADOR</span>' 
          : data.verificado ? '<span class="bg-blue-50 text-mqb-blue text-[10px] font-black px-3 py-1 rounded-full italic uppercase">✅ LISTO</span>'
          : '<span class="bg-gray-100 text-gray-400 text-[10px] font-black px-3 py-1 rounded-full italic uppercase">Pendiente</span>'}
      </td>
      <td class="p-6 text-right">
        <div class="flex justify-end gap-2">
            <button data-id="${id}" class="verificar w-10 h-10 rounded-xl bg-blue-50 text-mqb-blue hover:bg-mqb-blue hover:text-white transition-all"><i class="fa-solid fa-check"></i></button>
            <button data-id="${id}" class="ganador w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 hover:bg-yellow-500 hover:text-white transition-all"><i class="fa-solid fa-crown"></i></button>
            <button data-id="${id}" class="eliminar w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  initDashboardEvents(participantes);
}

// ===============================
// ⚡ EVENTOS CON LOADERS
// ===============================
function initDashboardEvents(participantes) {
    
    // VERIFICAR TODOS
    document.getElementById("verifyAll").onclick = async (e) => {
        const pendientes = participantes.filter(p => !p.verificado);
        if (pendientes.length === 0) return customModal("Aviso", "No hay participantes pendientes", "error");
        
        if (await customModal("Confirmar", `¿Verificar los ${pendientes.length} pendientes?`)) {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = `${getLoader()} Procesando...`;
            
            const batch = writeBatch(db);
            pendientes.forEach(p => {
                const ref = doc(db, COLLECTION_NAME, p.id);
                batch.update(ref, { verificado: true });
            });
            await batch.commit();
            renderDashboard();
        }
    };

    // GANADOR RANDOM
    document.getElementById("randomWinner").onclick = async (e) => {
        if (participantes.length === 0) return;
        if (await customModal("¡SORTEO!", "¿Elegir un ganador al azar ahora?")) {
            const btn = e.currentTarget;
            btn.innerHTML = `${getLoader()} Girando...`;
            
            // Quitar ganador actual
            const current = participantes.find(p => p.ganador);
            if(current) await updateDoc(doc(db, COLLECTION_NAME, current.id), { ganador: false });

            const winner = participantes[Math.floor(Math.random() * participantes.length)];
            await updateDoc(doc(db, COLLECTION_NAME, winner.id), { ganador: true });
            renderDashboard();
        }
    };

    // BOTONES DE FILA
    document.querySelectorAll(".verificar").forEach(btn => {
        btn.onclick = async () => {
            btn.innerHTML = getLoader();
            await updateDoc(doc(db, COLLECTION_NAME, btn.dataset.id), { verificado: true });
            renderDashboard();
        };
    });

    document.querySelectorAll(".ganador").forEach(btn => {
        btn.onclick = async () => {
            if (await customModal("Ganador", "¿Marcar como el nuevo ganador oficial?")) {
                btn.innerHTML = getLoader();
                const current = participantes.find(p => p.ganador);
                if(current) await updateDoc(doc(db, COLLECTION_NAME, current.id), { ganador: false });
                await updateDoc(doc(db, COLLECTION_NAME, btn.dataset.id), { ganador: true });
                renderDashboard();
            }
        };
    });

    document.querySelectorAll(".eliminar").forEach(btn => {
        btn.onclick = async () => {
            if (await customModal("BORRAR", "¿Eliminar para siempre este registro?", "confirm")) {
                btn.innerHTML = getLoader();
                await deleteDoc(doc(db, COLLECTION_NAME, btn.dataset.id));
                renderDashboard();
            }
        };
    });

    document.getElementById("logout").onclick = () => signOut(auth);
}

// Funciones globales
window.openPhoto = (url) => {
    const fullImg = document.getElementById('fullPhoto');
    fullImg.src = url;
    document.getElementById('photoModal').classList.remove('hidden');
    document.getElementById('photoModal').classList.add('flex');
};

// Control de Sesión
onAuthStateChanged(auth, user => user ? renderDashboard() : renderLogin());
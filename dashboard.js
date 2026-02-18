import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
// UTILIDADES
// ===============================

const customModal = (titulo, mensaje, tipo = 'confirm') => {
  return new Promise((resolve) => {
    const icon = tipo === 'error' ? 'warning' : 'lock';
    const cancelBtn = tipo === 'confirm'
      ? '<button id="modalCancel" class="flex-1 bg-gray-100 text-gray-400 p-4 rounded-xl font-impact text-xl uppercase italic">Cancelar</button>'
      : '';
    const confirmLabel = tipo === 'confirm' ? 'Confirmar' : 'Entendido';
    const confirmColor = tipo === 'error' ? 'bg-red-600' : 'bg-mqb-blue';

    const div = document.createElement('div');
    div.id = 'alertModal';
    div.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(10,10,11,0.8);backdrop-filter:blur(4px);';
    div.innerHTML = `
      <div class="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
        <div class="text-4xl">${tipo === 'error' ? '&#9888;&#65039;' : '&#128272;'}</div>
        <div>
          <h3 class="font-impact text-3xl text-mqb-blue uppercase italic leading-none">${titulo}</h3>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2">${mensaje}</p>
        </div>
        <div class="flex gap-3">
          ${cancelBtn}
          <button id="modalConfirm" class="flex-1 ${confirmColor} text-white p-4 rounded-xl font-impact text-xl uppercase italic shadow-lg">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    const close = (res) => { div.remove(); resolve(res); };
    div.querySelector('#modalConfirm').onclick = () => close(true);
    if (tipo === 'confirm') div.querySelector('#modalCancel').onclick = () => close(false);
  });
};

// Overlay de carga global
const showOverlay = (mensaje) => {
  if (document.getElementById('globalOverlay')) return;
  const div = document.createElement('div');
  div.id = 'globalOverlay';
  div.style.cssText = 'position:fixed;inset:0;z-index:250;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(1,73,38,0.93);backdrop-filter:blur(8px);';
  div.innerHTML = `
    <style>@keyframes gSpin{to{transform:rotate(360deg)}}</style>
    <div style="width:52px;height:52px;border:4px solid rgba(255,255,255,0.2);border-top-color:white;border-radius:50%;animation:gSpin 0.8s linear infinite;"></div>
    <p style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:white;letter-spacing:0.2em;text-transform:uppercase;font-style:italic;">${mensaje || 'Procesando...'}</p>
  `;
  document.body.appendChild(div);
};
const hideOverlay = () => document.getElementById('globalOverlay')?.remove();

const getLoader = () => '<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:gSpin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span>';

// ===============================
// VISOR DE FOTOS — galeria con soporte 1-3 fotos
// ===============================

let _gallery = [];
let _gIdx = 0;

function _getFotos(data) {
  if (Array.isArray(data.fotosURLs) && data.fotosURLs.length) return data.fotosURLs.slice(0, 3);
  if (data.fotoURL) return [data.fotoURL];
  return [];
}

function _renderGallery() {
  const fotos = _gallery;
  const i = _gIdx;

  const img = document.getElementById('fullPhoto');
  if (img) {
    img.style.opacity = '0';
    setTimeout(() => { img.src = fotos[i]; img.style.opacity = '1'; }, 100);
  }

  const counter = document.getElementById('photoCounter');
  if (counter) counter.textContent = fotos.length > 1 ? ('Foto ' + (i+1) + ' de ' + fotos.length) : '';

  const prev = document.getElementById('photoPrev');
  const next = document.getElementById('photoNext');
  const vis = fotos.length > 1 ? 'visible' : 'hidden';
  if (prev) prev.style.visibility = vis;
  if (next) next.style.visibility = vis;

  const thumbs = document.getElementById('photoThumbs');
  if (thumbs) {
    thumbs.innerHTML = fotos.length > 1 ? fotos.map((url, idx) => `
      <button onclick="window._gSetIdx(${idx})"
              style="width:50px;height:50px;border-radius:10px;overflow:hidden;border:2px solid ${idx===i?'white':'rgba(255,255,255,0.2)'};opacity:${idx===i?1:0.5};transition:all 0.15s;cursor:pointer;flex-shrink:0;">
        <img src="${url}" style="width:100%;height:100%;object-fit:cover;">
      </button>
    `).join('') : '';
  }
}

window._gSetIdx = (idx) => { _gIdx = idx; _renderGallery(); };
window.navigatePhoto = (dir) => { _gIdx = (_gIdx + dir + _gallery.length) % _gallery.length; _renderGallery(); };

window.openGallery = (startIndex, fotosJson) => {
  _gallery = JSON.parse(fotosJson);
  _gIdx = startIndex;
  _renderGallery();
  const m = document.getElementById('photoModal');
  m.classList.remove('hidden');
  m.classList.add('flex');
};

window.openPhoto = (url) => window.openGallery(0, JSON.stringify([url]));

window.closePhotoModal = () => {
  const m = document.getElementById('photoModal');
  m.classList.add('hidden');
  m.classList.remove('flex');
  _gallery = [];
  _gIdx = 0;
};

// ===============================
// MODAL GANADOR
// ===============================
const showWinnerModal = (winner) => {
  const fotos = _getFotos(winner);
  const fotoSrc = fotos[0] || '';
  const fotoTag = fotoSrc
    ? '<img src="' + fotoSrc + '" style="width:160px;height:160px;border-radius:50%;object-fit:cover;position:relative;z-index:1;border:4px solid white;">'
    : '<div style="width:160px;height:160px;border-radius:50%;background:#014926;display:flex;align-items:center;justify-content:center;font-size:3rem;position:relative;z-index:1;">&#127942;</div>';

  const tel = winner.telefono.replace(/\D/g,'');
  const div = document.createElement('div');
  div.id = 'winnerModal';
  div.style.cssText = 'position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.92);';
  div.innerHTML = `
    <style>
      @keyframes wEntrance{from{opacity:0;transform:scale(0.5) translateY(40px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes wSpin{to{transform:rotate(360deg)}}
    </style>
    <canvas id="confettiCanvas" style="position:fixed;inset:0;pointer-events:none;z-index:301;"></canvas>
    <div style="position:relative;z-index:302;width:100%;max-width:420px;text-align:center;animation:wEntrance 0.7s cubic-bezier(0.34,1.56,0.64,1) both;">
      <div style="position:relative;width:160px;height:160px;margin:0 auto 24px;">
        <div style="position:absolute;inset:-12px;border-radius:50%;background:conic-gradient(from 0deg,#FFD700,#014926,#FFD700,#014926,#FFD700);animation:wSpin 3s linear infinite;opacity:0.8;"></div>
        <div style="position:absolute;inset:-4px;border-radius:50%;background:white;"></div>
        ${fotoTag}
      </div>
      <div style="font-size:2.8rem;margin-bottom:4px;">&#127942;</div>
      <p style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:0.5em;color:#FFD700;text-transform:uppercase;margin-bottom:2px;">Tenemos un</p>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:3.5rem;color:white;line-height:1;text-transform:uppercase;font-style:italic;text-shadow:0 0 40px rgba(255,215,0,0.5);">GANADOR!</h2>
      <div style="margin-top:20px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,215,0,0.3);border-radius:24px;padding:22px;backdrop-filter:blur(10px);">
        <p style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:white;font-style:italic;text-transform:uppercase;line-height:1.1;">${winner.nombre}</p>
        <p style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:#FFD700;letter-spacing:0.2em;margin-top:4px;">@${winner.instagram}</p>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1);">
          <a href="https://wa.me/${tel}" target="_blank"
             style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:white;padding:10px 20px;border-radius:100px;font-weight:900;font-size:0.82rem;text-decoration:none;letter-spacing:0.05em;">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            ${winner.telefono}
          </a>
        </div>
      </div>
      <button onclick="document.getElementById('winnerModal').remove();window.stopConfetti();"
              style="margin-top:18px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.1);padding:10px 28px;border-radius:100px;font-size:0.72rem;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;">
        Cerrar
      </button>
    </div>
  `;
  document.body.appendChild(div);
  startConfetti();
};

let confettiAnim;
function startConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const pts = Array.from({length:130}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*-canvas.height,
    r: Math.random()*8+4,
    color: ['#FFD700','#014926','#ffffff','#ff6b35','#00c9ff'][Math.floor(Math.random()*5)],
    speed: Math.random()*3+2, spin: (Math.random()-0.5)*0.2,
    angle: Math.random()*Math.PI*2, wobble: Math.random()*0.05,
  }));
  const draw = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p => {
      p.y+=p.speed; p.angle+=p.wobble; p.x+=Math.sin(p.angle)*1.5;
      if(p.y>canvas.height){p.y=-20;p.x=Math.random()*canvas.width;}
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.spin*p.y*0.05);
      ctx.fillStyle=p.color; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.4); ctx.restore();
    });
    confettiAnim = requestAnimationFrame(draw);
  };
  draw();
}
window.stopConfetti = () => { if(confettiAnim) cancelAnimationFrame(confettiAnim); };

// ===============================
// LOGIN
// ===============================
function renderLogin() {
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4">
      <div class="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 text-center space-y-8">
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
    const orig = btn.innerText;
    btn.disabled = true;
    btn.innerHTML = getLoader() + ' Ingresando...';
    try {
      await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value);
    } catch (err) {
      btn.disabled = false;
      btn.innerText = orig;
      customModal("Error", "Credenciales incorrectas", "error");
    }
  });
}

// ===============================
// DASHBOARD
// ===============================
async function renderDashboard() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
  const snapshot = await getDocs(q);
  const total = snapshot.size;

  container.innerHTML = `
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex justify-between items-center">
      <h1 class="font-impact text-2xl uppercase italic">Registro de <span class="text-mqb-blue">fotos</span></h1>
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
            <i class="fa-solid fa-check-double mr-2"></i> Verificar Todos
          </button>
          
          <button id="deleteAll" class="bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-impact text-xl uppercase italic hover:bg-red-600 hover:text-white transition-all transform active:scale-95">
            <i class="fa-solid fa-trash-can mr-2"></i> Borrar Todos
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

    <div id="photoModal" class="fixed inset-0 z-[100] hidden flex-col items-center justify-center p-4" style="background:rgba(10,10,11,0.95);backdrop-filter:blur(12px);">
      <button id="photoClose"
        style="position:absolute;top:20px;right:20px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.12);border:none;color:white;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;transition:background 0.15s;"
        onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <p id="photoCounter" style="color:rgba(255,255,255,0.35);font-size:0.68rem;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:16px;min-height:16px;"></p>
      <div style="display:flex;align-items:center;gap:16px;width:100%;max-width:820px;justify-content:center;">
        <button id="photoPrev" onclick="window.navigatePhoto(-1)"
          style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.12);border:none;color:white;font-size:1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <img id="fullPhoto" src="" style="max-height:72vh;max-width:100%;border-radius:22px;box-shadow:0 25px 60px rgba(0,0,0,0.6);object-fit:contain;border:3px solid rgba(255,255,255,0.08);transition:opacity 0.15s;">
        <button id="photoNext" onclick="window.navigatePhoto(1)"
          style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.12);border:none;color:white;font-size:1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div id="photoThumbs" style="display:flex;gap:10px;margin-top:18px;"></div>
    </div>
  `;

  // Eventos visor
  document.getElementById('photoClose').onclick = () => window.closePhotoModal();
  document.addEventListener('keydown', handleModalKeys);

  // Construir filas
  const tbody = document.getElementById("tablaBody");
  const participantes = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    participantes.push({ id, ...data });

    const fotos = _getFotos(data);
    const fotosJSON = encodeURIComponent(JSON.stringify(fotos));

    const thumbsHTML = fotos.length
      ? fotos.map((url, i) => `
          <button onclick="openGallery(${i}, decodeURIComponent('${fotosJSON}'))"
                  style="width:52px;height:52px;border-radius:10px;overflow:hidden;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.1);cursor:zoom-in;flex-shrink:0;transition:transform 0.15s;"
                  onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <img src="${url}" style="width:100%;height:100%;object-fit:cover;">
          </button>
        `).join('')
      : '<span style="font-size:11px;color:#ccc;">Sin foto</span>';

    const badge = fotos.length > 1
      ? `<span style="font-size:8px;font-weight:900;background:#014926;color:white;padding:2px 7px;border-radius:100px;display:block;text-align:center;margin-top:3px;letter-spacing:0.05em;">${fotos.length} FOTOS</span>`
      : '';

    const row = document.createElement("tr");
    row.className = `border-b border-gray-50 transition-colors ${data.ganador ? 'bg-yellow-50' : ''}`;
    row.innerHTML = `
      <td class="p-6">
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;">
          <div style="display:flex;gap:4px;">${thumbsHTML}</div>
          ${badge}
        </div>
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
        ${data.ganador
          ? '<span class="bg-yellow-100 text-yellow-700 text-[10px] font-black px-3 py-1 rounded-full italic uppercase">&#127942; GANADOR</span>'
          : data.verificado
            ? '<span class="bg-blue-50 text-mqb-blue text-[10px] font-black px-3 py-1 rounded-full italic uppercase">&#9989; LISTO</span>'
            : '<span class="bg-gray-100 text-gray-400 text-[10px] font-black px-3 py-1 rounded-full italic uppercase">Pendiente</span>'}
      </td>
      <td class="p-6 text-right">
        <div class="flex justify-end gap-2">
          <button data-id="${id}" class="verificar w-10 h-10 rounded-xl bg-blue-50 text-mqb-blue hover:bg-mqb-blue hover:text-white transition-all" title="Verificar"><i class="fa-solid fa-check"></i></button>
          <button data-id="${id}" class="ganador w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 hover:bg-yellow-500 hover:text-white transition-all" title="Marcar ganador"><i class="fa-solid fa-crown"></i></button>
          <button data-id="${id}" class="eliminar w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  initDashboardEvents(participantes);
}

function handleModalKeys(e) {
  const modal = document.getElementById('photoModal');
  if (!modal || modal.classList.contains('hidden')) return;
  if (e.key === 'Escape') window.closePhotoModal();
  if (e.key === 'ArrowLeft') window.navigatePhoto(-1);
  if (e.key === 'ArrowRight') window.navigatePhoto(1);
}

// ===============================
// EVENTOS
// ===============================
function initDashboardEvents(participantes) {

  // VERIFICAR TODOS
  document.getElementById("verifyAll").onclick = async (e) => {
    const btn = e.currentTarget;
    const pendientes = participantes.filter(p => !p.verificado && !p.ganador);

    if (pendientes.length === 0) return customModal("Aviso", "No hay participantes pendientes", "error");

    const ok = await customModal("Confirmar", "¿Verificar " + pendientes.length + " pendientes?");
    if (!ok) return;

    btn.disabled = true;
    btn.innerHTML = getLoader() + ' Procesando...';
    showOverlay('Verificando ' + pendientes.length + ' participantes...');

    try {
      const batch = writeBatch(db);
      pendientes.forEach(p => batch.update(doc(db, COLLECTION_NAME, p.id), { verificado: true }));
      await batch.commit();
    } catch (err) {
      console.error("Error al verificar:", err);
      customModal("Error", "No se pudo completar la verificacion", "error");
    } finally {
      hideOverlay();
      renderDashboard();
    }
  };

  // ---------------------------------
  // BORRAR TODOS (LOGICA DE LOTES)
  // ---------------------------------
  document.getElementById("deleteAll").onclick = async (e) => {
    const btn = e.currentTarget;
    if (participantes.length === 0) return customModal("Vacío", "No hay datos para borrar", "error");

    // UNICA CONFIRMACION
    const ok = await customModal("¿Seguro?", "Esto eliminará a TODOS los " + participantes.length + " participantes.", "confirm");
    if (!ok) return;

    btn.disabled = true;
    btn.innerHTML = getLoader() + ' Borrando...';
    showOverlay("Borrando toda la base de datos...");

    try {
      // Obtenemos todos los documentos de nuevo para asegurar
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);

      // Algoritmo de borrado por lotes (Firebase permite max 500 por batch)
      const batches = [];
      let batch = writeBatch(db);
      let operationCounter = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        operationCounter++;

        // Si llegamos al limite seguro (450), enviamos el lote y creamos otro
        if (operationCounter >= 450) {
          batches.push(batch.commit());
          batch = writeBatch(db);
          operationCounter = 0;
        }
      });

      // Si quedaron operaciones en el ultimo lote, las enviamos
      if (operationCounter > 0) {
        batches.push(batch.commit());
      }

      await Promise.all(batches);
      customModal("Listo", "Base de datos vaciada", "confirm");

    } catch (err) {
      console.error("Error al borrar todo:", err);
      customModal("Error", "Ocurrió un error al intentar borrar", "error");
    } finally {
      hideOverlay();
      renderDashboard();
    }
  };

  // GANADOR RANDOM — solo verificados
  document.getElementById("randomWinner").onclick = async (e) => {
    const btn = e.currentTarget;
    const pool = participantes.filter(p => p.verificado);

    if (pool.length === 0) return customModal("Sin verificados", "No hay participantes verificados para sortear", "error");

    const ok = await customModal("SORTEO!", "Se elegira un ganador con los participantes actuales.");
    if (!ok) return;

    btn.disabled = true;
    btn.innerHTML = getLoader() + ' Girando...';
    showOverlay("Eligiendo ganador...");

    try {
      const current = participantes.find(p => p.ganador);
      if (current) await updateDoc(doc(db, COLLECTION_NAME, current.id), { ganador: false });

      const winner = pool[Math.floor(Math.random() * pool.length)];
      await updateDoc(doc(db, COLLECTION_NAME, winner.id), { ganador: true });

      hideOverlay();
      showWinnerModal(winner);
      renderDashboard();
    } catch (err) {
      console.error("Error al sortear:", err);
      hideOverlay();
      customModal("Error", "No se pudo completar el sorteo", "error");
      renderDashboard();
    }
  };

  // Verificar individual
  document.querySelectorAll(".verificar").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.innerHTML = getLoader();
      showOverlay("Verificando...");
      try { await updateDoc(doc(db, COLLECTION_NAME, id), { verificado: true }); }
      finally { hideOverlay(); renderDashboard(); }
    };
  });

  // Ganador individual
  document.querySelectorAll(".ganador").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const ok = await customModal("Ganador", "Marcar como el nuevo ganador oficial?");
      if (!ok) return;

      btn.disabled = true;
      btn.innerHTML = getLoader();
      showOverlay("Actualizando ganador...");

      try {
        const current = participantes.find(p => p.ganador);
        if (current) await updateDoc(doc(db, COLLECTION_NAME, current.id), { ganador: false });
        await updateDoc(doc(db, COLLECTION_NAME, id), { ganador: true });
        const winner = participantes.find(p => p.id === id);
        hideOverlay();
        if (winner) showWinnerModal(winner);
        renderDashboard();
      } catch (err) {
        hideOverlay();
        renderDashboard();
      }
    };
  });

  // Eliminar individual
  document.querySelectorAll(".eliminar").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const ok = await customModal("BORRAR", "¿Desea eliminar?", "confirm");
      if (!ok) return;
      btn.disabled = true;
      btn.innerHTML = getLoader();
      showOverlay("Eliminando...");
      try { await deleteDoc(doc(db, COLLECTION_NAME, id)); }
      finally { hideOverlay(); renderDashboard(); }
    };
  });

  document.getElementById("logout").onclick = () => signOut(auth);
}

// Control de Sesion
onAuthStateChanged(auth, user => user ? renderDashboard() : renderLogin());

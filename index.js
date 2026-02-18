// ===============================
// FIREBASE CONFIG
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const IMGBB_API_KEY = "fe4839b4c0f2de82e972746ad94f49f2";
const COLLECTION_NAME = "sorteo_apertura";
const MAX_FOTOS = 3;

// ===============================
// IMAGEN
// ===============================
const procesarImagen = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > 1200) { h *= 1200 / w; w = 1200; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject("Error"), "image/webp", 0.8);
      };
    };
    reader.onerror = reject;
  });
};

const subirImagen = async (file, i) => {
  const blob = await procesarImagen(file);
  const fd = new FormData();
  fd.append("image", blob, `participacion_${i + 1}.webp`);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
  const data = await res.json();
  if (!data.success) throw new Error("Error al subir imagen " + (i + 1));
  return data.data.url;
};

// ===============================
// ESTADO
// ===============================
let fotosSeleccionadas = [];

// ===============================
// UI — layout original, solo el form compactado
// ===============================
const container = document.getElementById("app");

container.innerHTML = `
  <div class="space-y-10 animate-fade-in">

    <div class="text-center space-y-4">
      <h1 class="font-impact text-5xl md:text-6xl text-mqb-blue uppercase italic leading-none tracking-tight">
        🎉 ¡Participá y ganá!
      </h1>
      <div class="space-y-2 text-gray-500 font-medium">
        <h2 class="font-impact text-2xl uppercase italic text-gray-400">¿Viniste al local?</h2>
        <p class="max-w-sm mx-auto">
          Subí tu foto en <span class="text-mqb-blue font-bold">Más Que Burgers</span> a tus historias mencionándonos y participá por premios especiales.
        </p>
      </div>
    </div>

    <div class="bg-mqb-blue rounded-[2.5rem] p-8 shadow-xl text-center relative overflow-hidden">
      <div class="relative z-10">
        <span class="bg-white text-mqb-blue text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest mb-4 inline-block">PRÓXIMAMENTE</span>
        <h3 class="font-impact text-4xl text-white uppercase italic mb-6">¡Premios todas las semanas!</h3>
        <div class="grid grid-cols-2 gap-4 text-white/90 font-impact text-xl uppercase italic">
          <div class="bg-white/10 p-4 rounded-2xl border border-white/10">🍔 Combos</div>
          <div class="bg-white/10 p-4 rounded-2xl border border-white/10">🎁 Regalos</div>
        </div>
      </div>
    </div>

    <div class="bg-gray-50/50 rounded-[2.5rem] p-8 border border-gray-100">
      <h3 class="font-impact text-3xl text-mqb-blue uppercase italic mb-6 text-center">Instrucciones:</h3>
      <div class="space-y-6 text-sm font-bold uppercase text-gray-600">

        <div class="flex items-center gap-5">
          <span class="bg-mqb-blue text-white w-10 h-10 rounded-full flex items-center justify-center font-impact text-2xl shrink-0">1</span>
          <p>Sacate una foto en el local o de la comida.</p>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-5">
            <span class="bg-mqb-blue text-white w-10 h-10 rounded-full flex items-center justify-center font-impact text-2xl shrink-0">2</span>
            <p>Subila a tus historias mencionando a <span class="text-mqb-blue">@mas_queburgers</span></p>
          </div>
          <a href="instagram://story-camera"
             onclick="handleInstagram(event)"
             class="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white py-3 px-4 rounded-xl font-impact text-lg uppercase italic tracking-wide shadow-md hover:shadow-xl active:scale-95 transition-all">
            <i class="fa-brands fa-instagram text-xl leading-none"></i>
            <span>Crear historia ahora</span>
          </a>
        </div>

        <div class="flex items-center gap-5">
          <span class="bg-mqb-blue text-white w-10 h-10 rounded-full flex items-center justify-center font-impact text-2xl shrink-0">3</span>
          <p>Completá el formulario y subí tus fotos. 👇</p>
        </div>

      </div>
    </div>

    <!-- FORMULARIO COMPACTADO -->
    <div class="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-2xl">
      <form id="sorteoForm" class="space-y-4">

        <!-- Nombre + WhatsApp — misma fila -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[9px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-1 block mb-1">Nombre</label>
            <input type="text" id="nombre" placeholder="TU NOMBRE"
              class="w-full p-3 rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 focus:ring-mqb-blue/5 outline-none font-bold text-sm uppercase transition-all" required>
          </div>
          <div>
            <label class="text-[9px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-1 block mb-1">WhatsApp</label>
            <input type="tel" id="telefono" placeholder="3735 000000"
              class="w-full p-3 rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 focus:ring-mqb-blue/5 outline-none font-bold text-sm transition-all" required>
          </div>
        </div>

        <!-- Instagram — ancho completo -->
        <div>
          <label class="text-[9px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-1 block mb-1">Instagram</label>
          <input type="text" id="instagram" placeholder="TU USUARIO SIN @"
            class="w-full p-3 rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 focus:ring-mqb-blue/5 outline-none font-bold text-sm transition-all" required>
        </div>

        <!-- FOTOS -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-[9px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-1">Tus fotos</label>
            <span id="fotoContador" class="text-[9px] font-black text-gray-300 italic">0 / ${MAX_FOTOS}</span>
          </div>

          <!-- Explicación compacta -->
          <div class="bg-gray-50 rounded-xl p-3 mb-3 space-y-1.5">
            <div class="flex items-start gap-2">
             
              <p class="text-[10px] leading-tight">
                <span class="font-black text-mqb-dark uppercase italic">Captura de tu historia</span>
                <span class="text-red-400 font-black"> — obligatoria</span>
              </p>
            </div>
            <div class="flex items-start gap-2">
            
              <p class="text-[10px] leading-tight">
                <span class="font-black text-mqb-dark uppercase italic">Fotos extras del local o la comida</span>
                <span class="text-gray-400 font-bold"> — hasta 2 más, opcionales</span>
              </p>
            </div>
          </div>

          <!-- Previews + botón en la misma fila -->
          <div class="flex flex-wrap gap-2 items-center" id="fotoZona">
            <input type="file" id="fotoInput" accept="image/*" multiple class="hidden">
            <button type="button" id="btnAgregarFoto"
              class="flex items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 font-impact text-sm uppercase italic hover:border-mqb-blue hover:text-mqb-blue transition-all shrink-0">
              <i class="fa-solid fa-camera"></i>
              <span id="btnAgregarTexto">Agregar foto</span>
            </button>
          </div>
        </div>

        <!-- Autorización -->
        <label class="flex items-center gap-2.5 cursor-pointer group">
          <input type="checkbox" id="autorizacion"
            class="w-4 h-4 rounded border-gray-200 text-mqb-blue focus:ring-mqb-blue/20" required>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight group-hover:text-mqb-blue transition-colors italic">
            Autorizo el uso de mi imagen
          </span>
        </label>

        <!-- Submit -->
        <button type="submit" id="btnSubmit"
          class="w-full bg-mqb-blue hover:bg-mqb-dark text-white p-5 rounded-2xl font-impact text-2xl uppercase italic tracking-[0.1em] shadow-lg shadow-mqb-blue/20 transition-all transform active:scale-95">
          Enviar Participación
        </button>

        <!-- Loader -->
        <div id="loader" class="hidden text-center py-3">
          <div class="inline-block animate-spin rounded-full h-7 w-7 border-4 border-mqb-blue border-t-transparent"></div>
          <p id="loaderTexto" class="font-impact text-mqb-blue text-lg mt-1.5 uppercase italic tracking-widest">Subiendo...</p>
        </div>

        <!-- Éxito -->
        <div id="mensaje" class="hidden text-center p-5 bg-mqb-blue rounded-2xl animate-fade-in shadow-xl">
          <p class="font-impact text-2xl text-white uppercase italic">¡Ya estás participando!</p>
          <p class="text-[10px] text-white/70 font-bold uppercase mt-1">Mucha suerte 🍀</p>
        </div>

      </form>
    </div>

  </div>
`;

// ===============================
// LOGICA DE FOTOS
// ===============================
const fotoInput    = document.getElementById('fotoInput');
const btnAgregar   = document.getElementById('btnAgregarFoto');
const btnTexto     = document.getElementById('btnAgregarTexto');
const fotoZona     = document.getElementById('fotoZona');
const fotoContador = document.getElementById('fotoContador');

function actualizarFotos() {
  const n = fotosSeleccionadas.length;

  // Contador
  fotoContador.textContent = `${n} / ${MAX_FOTOS}`;
  fotoContador.style.color = n > 0 ? '#014926' : '';

  // Quitar previews anteriores (conservar input y botón)
  fotoZona.querySelectorAll('.foto-preview').forEach(el => el.remove());

  // Insertar previews ANTES del botón
  fotosSeleccionadas.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.className = 'foto-preview';
    div.style.cssText = 'position:relative;flex-shrink:0;width:72px;height:72px;';
    div.innerHTML = `
      <img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:12px;border:2px solid ${i === 0 ? '#014926' : '#e5e7eb'};display:block;">
      ${i === 0 ? '<span style="position:absolute;top:3px;left:3px;background:#014926;color:white;font-size:6px;font-weight:900;padding:1px 5px;border-radius:100px;text-transform:uppercase;letter-spacing:0.05em;line-height:1.6;">Historia</span>' : ''}
      <button type="button" data-idx="${i}" class="foto-rm"
        style="position:absolute;top:-5px;right:-5px;width:20px;height:20px;background:#ef4444;border:none;border-radius:50%;color:white;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;box-shadow:0 1px 4px rgba(0,0,0,0.25);">×</button>
    `;
    fotoZona.insertBefore(div, btnAgregar);
  });

  // Botones quitar
  fotoZona.querySelectorAll('.foto-rm').forEach(btn => {
    btn.onclick = () => {
      fotosSeleccionadas.splice(+btn.dataset.idx, 1);
      actualizarFotos();
    };
  });

  // Mostrar / ocultar botón agregar
  if (n >= MAX_FOTOS) {
    btnAgregar.style.display = 'none';
  } else {
    btnAgregar.style.display = 'flex';
    const rest = MAX_FOTOS - n;
    btnTexto.textContent = n === 0
      ? 'Agregar foto'
      : `+ Otra${rest > 1 ? ` (${rest})` : ''}`;
  }
}

btnAgregar.onclick = () => { fotoInput.value = ''; fotoInput.click(); };
fotoInput.addEventListener('change', () => {
  const nuevas = Array.from(fotoInput.files).slice(0, MAX_FOTOS - fotosSeleccionadas.length);
  fotosSeleccionadas = [...fotosSeleccionadas, ...nuevas];
  actualizarFotos();
});
actualizarFotos();

// ===============================
// MODAL DUPLICADO
// ===============================
document.body.insertAdjacentHTML("beforeend", `
  <div id="modalYaParticipa" class="fixed inset-0 z-[100] items-center justify-center p-4 hidden">
    <div id="modalBackdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div id="modalCard" class="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center transform scale-95 opacity-0 transition-all duration-300">
      <div class="w-20 h-20 bg-mqb-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-mqb-blue/30">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <span class="bg-mqb-blue/10 text-mqb-blue text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest inline-block mb-4">Participación registrada</span>
      <h2 class="font-impact text-4xl text-mqb-blue uppercase italic leading-tight mb-3">¡Ya estás<br>participando!</h2>
      <p class="text-gray-400 text-sm font-bold uppercase tracking-wide mb-2">Solo se permite una participación por persona.</p>
      <p class="text-gray-300 text-[11px] font-medium mb-8">Tu registro ya fue recibido. ¡Mucha suerte en el sorteo! 🍀</p>
      <button id="modalCerrar" class="w-full bg-mqb-blue hover:bg-mqb-dark text-white p-4 rounded-2xl font-impact text-xl uppercase italic tracking-widest transition-all transform active:scale-95 shadow-lg shadow-mqb-blue/20">
        Entendido
      </button>
    </div>
  </div>
`);

function mostrarModalDuplicado() {
  const modal = document.getElementById("modalYaParticipa");
  const card  = document.getElementById("modalCard");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  setTimeout(() => {
    card.classList.remove("scale-95", "opacity-0");
    card.classList.add("scale-100", "opacity-100");
  }, 10);
  document.getElementById("modalCerrar").onclick = cerrarModal;
  document.getElementById("modalBackdrop").onclick = cerrarModal;
}

function cerrarModal() {
  const card = document.getElementById("modalCard");
  card.classList.remove("scale-100", "opacity-100");
  card.classList.add("scale-95", "opacity-0");
  setTimeout(() => {
    const modal = document.getElementById("modalYaParticipa");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }, 300);
}


// ===============================
// INSTAGRAM DEEP LINK
// ===============================
window.handleInstagram = (e) => {
  e.preventDefault();
  window.location.href = 'instagram://story-camera';
  // Solo abre instagram.com si la pagina sigue visible
  // (Instagram no instalado: deep link no funciono)
  setTimeout(() => {
    if (!document.hidden) {
      window.open('https://www.instagram.com/', '_blank');
    }
  }, 1500);
};

// ===============================
// ENVIO
// ===============================
const form      = document.getElementById("sorteoForm");
const loader    = document.getElementById("loader");
const loaderTxt = document.getElementById("loaderTexto");
const mensaje   = document.getElementById("mensaje");
const btnSubmit = document.getElementById("btnSubmit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre      = document.getElementById("nombre").value.trim();
  const telefono    = document.getElementById("telefono").value.trim();
  const instagram   = document.getElementById("instagram").value.trim();
  const autorizacion = document.getElementById("autorizacion").checked;

  if (!fotosSeleccionadas.length) {
    alert("Tenés que subir al menos la captura de tu historia de Instagram.");
    return;
  }
  if (!autorizacion) {
    alert("Debes aceptar la autorización.");
    return;
  }

  loader.classList.remove("hidden");
  btnSubmit.classList.add("hidden");
  mensaje.classList.add("hidden");

  try {
    // 1) Duplicados
    loaderTxt.textContent = "Verificando...";

    const snapTel = await getDocs(query(collection(db, COLLECTION_NAME), where("telefono", "==", telefono)));
    if (!snapTel.empty) {
      loader.classList.add("hidden"); btnSubmit.classList.remove("hidden");
      form.reset(); fotosSeleccionadas = []; actualizarFotos();
      mostrarModalDuplicado(); return;
    }

    const snapInsta = await getDocs(query(collection(db, COLLECTION_NAME), where("instagram", "==", instagram)));
    if (!snapInsta.empty) {
      loader.classList.add("hidden"); btnSubmit.classList.remove("hidden");
      form.reset(); fotosSeleccionadas = []; actualizarFotos();
      mostrarModalDuplicado(); return;
    }

    // 2) Subir fotos
    const total = fotosSeleccionadas.length;
    loaderTxt.textContent = `Subiendo ${total} foto${total > 1 ? 's' : ''}...`;
    const fotosURLs = await Promise.all(fotosSeleccionadas.map((f, i) => subirImagen(f, i)));

    // 3) Guardar
    loaderTxt.textContent = "Guardando...";
    await addDoc(collection(db, COLLECTION_NAME), {
      nombre, telefono, instagram,
      fotosURLs,
      fotoURL: fotosURLs[0],
      fecha: serverTimestamp(),
      verificado: false,
      ganador: false
    });

    loader.classList.add("hidden");
    mensaje.classList.remove("hidden");
    form.reset();
    fotosSeleccionadas = [];
    actualizarFotos();

    setTimeout(() => {
      btnSubmit.classList.remove("hidden");
      mensaje.classList.add("hidden");
    }, 8000);

  } catch (err) {
    console.error(err);
    loader.classList.add("hidden");
    btnSubmit.classList.remove("hidden");
    btnSubmit.textContent = "Ocurrió un error, intentá de nuevo";
    setTimeout(() => { btnSubmit.textContent = "Enviar Participación"; }, 4000);
  }
});

// ===============================
// 🔥 FIREBASE CONFIG
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

// ===============================
// ⚙ CONFIGURACIÓN
// ===============================
const IMGBB_API_KEY = "fe4839b4c0f2de82e972746ad94f49f2";
const COLLECTION_NAME = "sorteo_apertura";

// ===============================
// 🛠 UTILIDAD: OPTIMIZACIÓN
// ===============================
const procesarImagen = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Error al convertir.");
        }, "image/webp", 0.8);
      };
    };
    reader.onerror = (err) => reject(err);
  });
};

// ===============================
// 🧱 DISEÑO E INYECCIÓN DE UI
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
        <h3 class="font-impact text-4xl text-white uppercase italic mb-6">Premios Sorpresa</h3>
        <div class="grid grid-cols-2 gap-4 text-white/90 font-impact text-xl uppercase italic">
          <div class="bg-white/10 p-4 rounded-2xl border border-white/10">🍔 Combos</div>
          <div class="bg-white/10 p-4 rounded-2xl border border-white/10">🎁 Regalos</div>
        </div>
      </div>
    </div>

    <div class="bg-gray-50/50 rounded-[2.5rem] p-8 border border-gray-100">
      <h3 class="font-impact text-3xl text-mqb-blue uppercase italic mb-6 text-center text-mqb-blue">Instrucciones:</h3>
      <div class="space-y-6 text-sm font-bold uppercase text-gray-600">
        <div class="flex items-center gap-5">
          <span class="bg-mqb-blue text-white w-10 h-10 rounded-full flex items-center justify-center font-impact text-2xl shrink-0">1</span>
          <p>Sacate una foto en el local o de la comida.</p>
        </div>
        <div class="flex items-center gap-5">
          <span class="bg-mqb-blue text-white w-10 h-10 rounded-full flex items-center justify-center font-impact text-2xl shrink-0">2</span>
          <p>Subila a tus historias mencionando a <span class="text-mqb-blue">@masqueburgers</span></p>
        </div>
        <div class="flex items-center gap-5">
          <span class="bg-mqb-blue text-white w-10 h-10 rounded-full flex items-center justify-center font-impact text-2xl shrink-0">3</span>
          <p>Subí la captura acá abajo completando los datos.👇</p>
        </div>
      </div>
    </div>

    <div class="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl">
      <form id="sorteoForm" class="space-y-6">
        <div>
          <label class="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-2">Nombre completo</label>
          <input type="text" id="nombre" placeholder="TU NOMBRE" class="w-full p-4 mt-1 rounded-2xl bg-gray-50 border-transparent focus:border-mqb-blue/20 focus:bg-white focus:ring-4 focus:ring-mqb-blue/5 transition-all outline-none font-bold uppercase" required>
        </div>

        <div>
          <label class="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-2">WhatsApp</label>
          <input type="tel" id="telefono" placeholder="3735 000000" class="w-full p-4 mt-1 rounded-2xl bg-gray-50 border-transparent focus:border-mqb-blue/20 focus:bg-white focus:ring-4 focus:ring-mqb-blue/5 transition-all outline-none font-bold" required>
        </div>

        <div>
          <label class="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-2">Usuario Instagram</label>
          <input type="text" id="instagram" placeholder="@USUARIO" class="w-full p-4 mt-1 rounded-2xl bg-gray-50 border-transparent focus:border-mqb-blue/20 focus:bg-white focus:ring-4 focus:ring-mqb-blue/5 transition-all outline-none font-bold" required>
        </div>

        <div>
          <label class="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em] italic ml-2">Captura de la Historia</label>
          <input type="file" id="foto" accept="image/*" class="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-mqb-blue file:text-white hover:file:bg-mqb-dark cursor-pointer transition-all" required>
        </div>

        <label class="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" id="autorizacion" class="w-5 h-5 rounded-lg border-gray-200 text-mqb-blue focus:ring-mqb-blue/20" required>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight group-hover:text-mqb-blue transition-colors italic">Autorizo el uso de mi imagen</span>
        </label>

        <button type="submit" id="btnSubmit" class="w-full bg-mqb-blue hover:bg-mqb-dark text-white p-5 rounded-2xl font-impact text-2xl uppercase italic tracking-[0.1em] shadow-lg shadow-mqb-blue/20 transition-all transform active:scale-95">
          Enviar Participación
        </button>

        <div id="loader" class="hidden text-center py-4">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-mqb-blue border-t-transparent"></div>
            <p class="font-impact text-mqb-blue text-xl mt-2 uppercase italic tracking-widest">Subiendo...</p>
        </div>

        <div id="mensaje" class="hidden text-center p-6 bg-mqb-blue rounded-[2rem] animate-fade-in shadow-xl">
            <p class="font-impact text-2xl text-white uppercase italic">¡Ya estás participando!</p>
            <p class="text-[10px] text-white/70 font-bold uppercase mt-1">Mucha suerte</p>
        </div>
      </form>
    </div>
  </div>
`;

// ===============================
// 🚫 MODAL "YA PARTICIPÁS"
// ===============================
const modalHTML = `
  <div id="modalYaParticipa" class="fixed inset-0 z-[100] items-center justify-center p-4 hidden">
    <div id="modalBackdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div id="modalCard" class="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center transform scale-95 opacity-0 transition-all duration-300">
      
      <div class="w-20 h-20 bg-mqb-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-mqb-blue/30">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <span class="bg-mqb-blue/10 text-mqb-blue text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest inline-block mb-4">Participación registrada</span>

      <h2 class="font-impact text-4xl text-mqb-blue uppercase italic leading-tight mb-3">
        ¡Ya estás<br>participando!
      </h2>

      <p class="text-gray-400 text-sm font-bold uppercase tracking-wide mb-2">
        Solo se permite una participación por persona.
      </p>
      <p class="text-gray-300 text-[11px] font-medium mb-8">
        Tu registro ya fue recibido. ¡Mucha suerte en el sorteo! 🍀
      </p>

      <button id="modalCerrar" class="w-full bg-mqb-blue hover:bg-mqb-dark text-white p-4 rounded-2xl font-impact text-xl uppercase italic tracking-widest transition-all transform active:scale-95 shadow-lg shadow-mqb-blue/20">
        Entendido
      </button>
    </div>
  </div>
`;

document.body.insertAdjacentHTML("beforeend", modalHTML);

function mostrarModalDuplicado() {
  const modal = document.getElementById("modalYaParticipa");
  const card = document.getElementById("modalCard");
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
  const modal = document.getElementById("modalYaParticipa");
  const card = document.getElementById("modalCard");
  card.classList.remove("scale-100", "opacity-100");
  card.classList.add("scale-95", "opacity-0");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }, 300);
}

// ===============================
// 🚀 LÓGICA DE ENVÍO
// ===============================
const form = document.getElementById("sorteoForm");
const loader = document.getElementById("loader");
const mensaje = document.getElementById("mensaje");
const btnSubmit = document.getElementById("btnSubmit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const instagram = document.getElementById("instagram").value.trim();
  const fotoOriginal = document.getElementById("foto").files[0];
  const autorizacion = document.getElementById("autorizacion").checked;

  if (!fotoOriginal) return alert("Debes subir una imagen.");
  if (!autorizacion) return alert("Debes aceptar la autorización.");

  loader.classList.remove("hidden");
  btnSubmit.classList.add("hidden");
  mensaje.classList.add("hidden");

  try {
    // 1️⃣ VALIDACIÓN DE DUPLICADOS (secuencial para evitar errores de índice)
    const qTel = query(collection(db, COLLECTION_NAME), where("telefono", "==", telefono));
    const snapTel = await getDocs(qTel);
    if (!snapTel.empty) {
      loader.classList.add("hidden");
      btnSubmit.classList.remove("hidden");
      form.reset();
      mostrarModalDuplicado();
      return;
    }

    const qInsta = query(collection(db, COLLECTION_NAME), where("instagram", "==", instagram));
    const snapInsta = await getDocs(qInsta);
    if (!snapInsta.empty) {
      loader.classList.add("hidden");
      btnSubmit.classList.remove("hidden");
      form.reset();
      mostrarModalDuplicado();
      return;
    }

    // 2️⃣ PROCESAMIENTO E IMGBB
    const fotoWebP = await procesarImagen(fotoOriginal);
    const formData = new FormData();
    formData.append("image", fotoWebP, "participacion.webp");

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (!data.success) throw new Error("Error al subir.");

    // 3️⃣ GUARDAR EN FIRESTORE
    await addDoc(collection(db, COLLECTION_NAME), {
      nombre,
      telefono,
      instagram,
      fotoURL: data.data.url,
      fecha: serverTimestamp(),
      verificado: false,
      ganador: false
    });

    loader.classList.add("hidden");
    mensaje.classList.remove("hidden");
    form.reset();
    
    setTimeout(() => {
        btnSubmit.classList.remove("hidden");
        mensaje.classList.add("hidden");
    }, 8000);

  } catch (error) {
    console.error("Error detallado:", error?.message || error?.code || error);
    loader.classList.add("hidden");
    btnSubmit.classList.remove("hidden");
    btnSubmit.textContent = "Ocurrió un error, intentá de nuevo";
    setTimeout(() => { btnSubmit.textContent = "Enviar Participación"; }, 4000);
  }
});
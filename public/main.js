/* =========================================================
   PACA — até 10 participantes
   Vídeo/áudio + chat + arquivos. Sem histórico, sem cache.
   ========================================================= */

// captura erros de script e mostra na tela
window.addEventListener("error", (e) => {
  console.error("ERRO DE SCRIPT:", e.message, "|", e.filename + ":" + e.lineno);
  const t = document.getElementById("toast");
  if (t) {
    t.textContent = "Erro: " + e.message;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 5000);
  }
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("PROMISE REJEITADA:", e.reason);
  const t = document.getElementById("toast");
  if (t) { t.textContent = "Erro interno"; t.classList.add("show"); }
});

// Token de acesso (vem da URL: ?token=XXXX) - fica só na memória, nunca é salvo
const ACCESS_TOKEN = new URLSearchParams(window.location.search).get("token") || "";

const socket = io({
  query: { token: ACCESS_TOKEN },
  transports: ["websocket", "polling"]
});

// ---------- ELEMENTOS ----------
const homeScreen = document.getElementById("home-screen");
const callScreen = document.getElementById("call-screen");

const nameGrid = document.getElementById("nameGrid");
const nameError = document.getElementById("nameError");
const onlineList = document.getElementById("onlineList");
const onlineCount = document.getElementById("onlineCount");
const customNameInput = document.getElementById("customNameInput");
const optChatOnly = document.getElementById("optChatOnly");
const optAudioOnly = document.getElementById("optAudioOnly");
const optSpeaker = document.getElementById("optSpeaker");
const enterBtn = document.getElementById("enterBtn");

const myNameDisplay = document.getElementById("myNameDisplay");
const countDisplay = document.getElementById("countDisplay");
const videoGrid = document.getElementById("videoGrid");

const toggleMicBtn = document.getElementById("toggleMicBtn");
const toggleCamBtn = document.getElementById("toggleCamBtn");
const toggleAudioOnlyBtn = document.getElementById("toggleAudioOnlyBtn");
const toggleSpeakerBtn = document.getElementById("toggleSpeakerBtn");
const chatBtn = document.getElementById("chatBtn");
const exitBtn = document.getElementById("exitBtn");

const chatPanel = document.getElementById("chatPanel");
const chatToggle = document.getElementById("chatToggle");
const peoplePanel = document.getElementById("peoplePanel");
const peopleList = document.getElementById("peopleList");
const peopleCount = document.getElementById("peopleCount");
const peopleToggle = document.getElementById("peopleToggle");
const peopleBtn = document.getElementById("peopleBtn");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");

const toast = document.getElementById("toast");
const captureBlock = document.getElementById("captureBlock");

// ---------- CONSTANTES ----------
const NAMES = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA", "JULIET"];
const MAX_PHOTO = 1 * 1024 * 1024;   // 1 MB
const MAX_VIDEO = 2 * 1024 * 1024;   // 2 MB
const MAX_W = 1280;
const MAX_H = 720;

// ---------- ESTADO ----------
let myName = null;
let localStream = null;
let selectedName = null;
let audioOnly = false;
let chatOnly = false;
let speakerOn = true;
let isMicOn = true;
let isCamOn = true;

const peers = new Map();          // socketId -> { pc, name, audioOnly, candidates: [] }
const roster = new Map();         // socketId -> { name, audioOnly, speaker }
const tiles = new Map();          // socketId -> tile element

// ---------- MODO DEBUG (ative com ?debug=1 na URL) ----------
const DEBUG = new URLSearchParams(window.location.search).has("debug");
function dbg(msg) {
  if (!DEBUG) return;
  const el = document.getElementById("debugPanel");
  if (el) {
    const line = document.createElement("div");
    line.textContent = new Date().toLocaleTimeString() + " " + msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }
  console.log("[DEBUG]", msg);
}

// ---------- POLYFILL PARA iOS / Safari ANTIGO ----------
(function polyfillIOS() {
  dbg("polyfill: iniciando");
  if (!navigator.mediaDevices) navigator.mediaDevices = {};
  if (!navigator.mediaDevices.getUserMedia) {
    const antigo = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (antigo) {
      navigator.mediaDevices.getUserMedia = function (constraints) {
        return new Promise((resolve, reject) => {
          antigo.call(navigator, constraints, resolve, reject);
        });
      };
    }
  }
  if (!window.RTCPeerConnection) {
    window.RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  }
  if (!window.RTCSessionDescription) {
    window.RTCSessionDescription = window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
  }
  if (!window.RTCIceCandidate) {
    window.RTCIceCandidate = window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
  }
  if (!window.MediaStream) {
    window.MediaStream = window.webkitMediaStream;
  }
  if (!window.URL) window.URL = window.webkitURL || window.msURL;
  dbg("polyfill: concluido. RTCPeerConnection=" + (typeof RTCPeerConnection));
})();

window.addEventListener("error", (e) => {
  console.error("ERRO DE SCRIPT:", e.message, "|", e.filename + ":" + e.lineno);
  const t = document.getElementById("toast");
  if (t) {
    t.textContent = "Erro: " + e.message;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 6000);
  }
  const box = document.getElementById("nameError");
  if (box) box.textContent = "Erro: " + e.message;
  dbg("ERRO: " + e.message + " em " + e.filename + ":" + e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("PROMISE REJEITADA:", e.reason);
  const t = document.getElementById("toast");
  if (t) {
    t.textContent = "Erro: " + (e.reason && e.reason.message ? e.reason.message : e.reason);
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 6000);
  }
  dbg("PROMISE REJEITADA: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

// ---------- CONFIGURAÇÃO DE REDE (ICE) ----------
// Preenchida pelo servidor em /api/config (permite configurar TURN sem mexer no código)
let ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ],
  iceCandidatePoolSize: 4
};
let MAX_PARTICIPANTS = 10;

// ---------- QUALIDADE ADAPTATIVA POR NÚMERO DE PARTICIPANTES ----------
// Quanto mais gente na sala, menor a qualidade enviada por cada um.
// Em malha cada pessoa envia 1 stream para CADA participante, então
// com muita gente é essencial reduzir para não estourar a banda.
const QUALIDADE = {
  1:  { w: 1280, h: 720, fps: 30, kbps: 1500 },
  2:  { w: 1280, h: 720, fps: 30, kbps: 1200 },
  3:  { w: 960,  h: 540, fps: 24, kbps: 800  },
  4:  { w: 960,  h: 540, fps: 24, kbps: 700  },
  5:  { w: 640,  h: 360, fps: 20, kbps: 500  },
  7:  { w: 480,  h: 270, fps: 15, kbps: 300  },
  10: { w: 320,  h: 180, fps: 12, kbps: 180  }
};

function perfilQualidade(total) {
  const chaves = Object.keys(QUALIDADE).map(Number).sort((a, b) => a - b);
  let perfil = QUALIDADE[chaves[0]];
  for (const k of chaves) {
    if (total >= k) perfil = QUALIDADE[k];
  }
  return perfil;
}



// ---------- AJUDANTES ----------
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

// ---------- PERMISSÕES DO DISPOSITIVO ----------
const camStatus = document.getElementById("camStatus");
const micStatus = document.getElementById("micStatus");
const camPermBtn = document.getElementById("camPermBtn");
const micPermBtn = document.getElementById("micPermBtn");
const enableAllBtn = document.getElementById("enableAllBtn");
const permHelp = document.getElementById("permHelp");
const permHelpText = document.getElementById("permHelpText");
const openSettingsBtn = document.getElementById("openSettingsBtn");

let camPermState = "prompt";
let micPermState = "prompt";

function dotClass(state) {
  if (state === "granted") return "dot dot-granted";
  if (state === "denied") return "dot dot-denied";
  return "dot dot-prompt";
}

function permLabel(state) {
  if (state === "granted") return "Ativada";
  if (state === "denied") return "Bloqueada";
  if (state === "nodevice") return "Sem dispositivo";
  if (state === "inuse") return "Em uso por outro app";
  if (state === "insecure") return "Precisa de HTTPS";
  return "Não solicitada";
}

function updatePermUI() {
  camStatus.innerHTML = `<span class="${dotClass(camPermState)}"></span>${permLabel(camPermState)}`;
  micStatus.innerHTML = `<span class="${dotClass(micPermState)}"></span>${permLabel(micPermState)}`;

  document.querySelector(".perm-icon-cam").classList.toggle("active", camPermState === "granted");
  document.querySelector(".perm-icon-mic").classList.toggle("active", micPermState === "granted");

  camPermBtn.textContent = camPermState === "granted" ? "Ativada" : "Ativar";
  micPermBtn.textContent = micPermState === "granted" ? "Ativada" : "Ativar";
  camPermBtn.disabled = camPermState === "granted";
  micPermBtn.disabled = micPermState === "granted";

  const problem = camPermState === "denied" || micPermState === "denied"
    || camPermState === "nodevice" || micPermState === "nodevice"
    || camPermState === "inuse" || micPermState === "inuse"
    || camPermState === "insecure" || micPermState === "insecure";
  permHelp.style.display = problem ? "block" : "none";

  if (!problem) return;

  const parts = [];
  if (camPermState === "denied" || micPermState === "denied") {
    parts.push("<strong>Permissão bloqueada.</strong> Clique no ícone de cadeado (🔒) na barra de endereço do navegador → <strong>Configurações do site</strong> → troque <strong>Câmera</strong> e <strong>Microfone</strong> para <strong>Permitir</strong> → recarregue a página.");
  }
  if (camPermState === "nodevice" || micPermState === "nodevice") {
    parts.push("<strong>Dispositivo não encontrado.</strong> Conecte uma câmera ou microfone ao aparelho e clique em <strong>Ativar</strong> novamente.");
  }
  if (camPermState === "inuse" || micPermState === "inuse") {
    parts.push("<strong>Dispositivo em uso.</strong> Feche outros aplicativos que estejam usando a câmera ou o microfone (Zoom, Teams, Meet, etc.) e tente de novo.");
  }
  if (camPermState === "insecure" || micPermState === "insecure") {
    parts.push("<strong>Precisa de HTTPS.</strong> O navegador só libera câmera e microfone em endereços <strong>https://</strong> ou em <strong>localhost</strong>. Acesse por <code>http://localhost:3000</code> ou publique com SSL.");
  }
  permHelpText.innerHTML = parts.join("<br><br>");
}

function setPerm(kind, state) {
  if (kind === "camera") camPermState = state;
  else micPermState = state;
  updatePermUI();
}

async function queryPerm(name) {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name });
      status.onchange = () => {
        setPerm(name === "camera" ? "camera" : "microphone", status.state);
      };
      return status.state;
    }
  } catch (e) {}
  return "prompt";
}

async function checkPerms() {
  if (!window.isSecureContext) {
    setPerm("camera", "insecure");
    setPerm("microphone", "insecure");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setPerm("camera", "insecure");
    setPerm("microphone", "insecure");
    return;
  }
  camPermState = await queryPerm("camera");
  micPermState = await queryPerm("microphone");
  updatePermUI();
}

/**
 * Pede a permissão de verdade abrindo a janela do navegador.
 * 1) Permissions API (abre o popup nativo do navegador)
 * 2) getUserMedia como reserva (também abre o popup)
 */
async function requestPermission(kind) {
  const name = kind === "camera" ? "camera" : "microphone";
  const constraints = kind === "camera" ? { video: true } : { audio: true };

  if (!window.isSecureContext || !navigator.mediaDevices) {
    setPerm(kind, "insecure");
    showToast("É preciso HTTPS ou localhost para usar a câmera");
    return false;
  }

  // 1) Permissions API — é a que abre o diálogo nativo
  try {
    if (navigator.permissions && navigator.permissions.query && navigator.permissions.request) {
      const st = await navigator.permissions.query({ name });
      if (st.state === "prompt") {
        const res = await navigator.permissions.request({ name });
        if (res && res.state === "granted") {
          setPerm(kind, "granted");
          return true;
        }
        if (res && res.state === "denied") {
          setPerm(kind, "denied");
          showToast(`Permissão de ${kind === "camera" ? "câmera" : "microfone"} negada`);
          return false;
        }
      } else if (st.state === "granted") {
        setPerm(kind, "granted");
        return true;
      } else {
        // já está bloqueada de forma permanente: o navegador não abre mais a janela
        setPerm(kind, "denied");
        showToast("Permissão bloqueada. Libere nas configurações do navegador.");
        return false;
      }
    }
  } catch (e) {
    // Permissions API não suporta esse nome -> segue para o getUserMedia
  }

  // 2) Reserva via getUserMedia (abre o popup do navegador)
  try {
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    s.getTracks().forEach((t) => t.stop());
    setPerm(kind, "granted");
    return true;
  } catch (err) {
    const code = err && err.name;
    if (code === "NotAllowedError" || code === "SecurityError") {
      setPerm(kind, "denied");
      showToast("Permissão negada. Libere nas configurações do navegador.");
    } else if (code === "NotFoundError" || code === "OverconstrainedError") {
      setPerm(kind, "nodevice");
      showToast(`Nenhum dispositivo de ${kind === "camera" ? "câmera" : "microfone"} encontrado`);
    } else if (code === "NotReadableError" || code === "AbortError") {
      setPerm(kind, "inuse");
      showToast("Dispositivo em uso por outro aplicativo");
    } else {
      setPerm(kind, "denied");
      showToast("Não foi possível ativar o dispositivo");
    }
    return false;
  }
}

camPermBtn.addEventListener("click", () => requestPermission("camera"));
micPermBtn.addEventListener("click", () => requestPermission("microphone"));

openSettingsBtn.addEventListener("click", () => {
  const urls = [
    "chrome://settings/content/camera",
    "edge://settings/content/camera",
    "chrome://settings/content/microphone",
    "edge://settings/content/microphone"
  ];
  let opened = false;
  for (const u of urls) {
    try {
      const w = window.open(u, "_blank");
      if (w) { opened = true; break; }
    } catch (e) {}
  }
  if (!opened) {
    showToast("Abra manualmente: chrome://settings/content/camera");
  }
});

enableAllBtn.addEventListener("click", async () => {
  const okCam = await requestPermission("camera");
  const okMic = await requestPermission("microphone");
  if (okCam && okMic) showToast("Câmera e microfone ativados");
});

// ---------- LISTA DE NOMES (tela inicial) ----------
function renderNames(taken) {
  nameGrid.innerHTML = "";
  NAMES.forEach((n) => {
    const b = document.createElement("button");
    b.className = "name-item";
    b.textContent = n;

    if (taken.includes(n)) {
      // já está online -> mostra a bolinha verde e bloqueia
      b.disabled = true;
      b.classList.add("ocupado");
      b.innerHTML = `<span>${n}</span><i class="dot dot-granted"></i>`;
    } else {
// quando clica na grade, limpa o campo customizado
      b.addEventListener("click", () => {
        selectedName = n;
        if (customNameInput) customNameInput.value = "";
        nameError.textContent = "";
        nameGrid.querySelectorAll(".name-item").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      });
    }

    if (selectedName === n && !taken.includes(n)) b.classList.add("selected");
    nameGrid.appendChild(b);
  });
}

// ---------- LISTA DE QUEM ESTÁ ONLINE (tela inicial) ----------
function renderOnline(online) {
  const lista = online || [];
  onlineCount.textContent = `${lista.length}/${MAX_PARTICIPANTS}`;
  onlineList.innerHTML = "";

  if (lista.length === 0) {
    const empty = document.createElement("div");
    empty.className = "online-empty";
    empty.textContent = "Ninguém online no momento. Seja o primeiro!";
    onlineList.appendChild(empty);
    return;
  }

  lista.forEach((p) => {
    const chip = document.createElement("div");
    chip.className = "online-chip";

    const dot = document.createElement("i");
    dot.className = "dot dot-granted";
    chip.appendChild(dot);

    const nome = document.createElement("span");
    nome.textContent = p.name;
    chip.appendChild(nome);

    if (p.audioOnly) {
      const tag = document.createElement("span");
      tag.className = "chip-tag";
      tag.textContent = "ÁUDIO";
      chip.appendChild(tag);
    }

    onlineList.appendChild(chip);
  });
}

socket.on("names", ({ taken, online }) => {
  renderNames(taken || []);
  renderOnline(online || []);
});

// ---------- ENTRAR NA CHAMADA ----------
enterBtn.addEventListener("click", async () => {
  // Nome personalizado tem prioridade sobre a grade
  const custom = customNameInput ? customNameInput.value.trim().toUpperCase() : "";
  if (custom) {
    selectedName = custom;
    // desmarca a grade
    nameGrid.querySelectorAll(".name-item").forEach((x) => x.classList.remove("selected"));
  }
  if (!selectedName) {
    nameError.textContent = "Escolha um nome da lista ou digite um personalizado.";
    return;
  }
  chatOnly = optChatOnly ? optChatOnly.checked : false;
  audioOnly = chatOnly ? true : optAudioOnly.checked;
  speakerOn = optSpeaker.checked;

  // MODO SOMENTE CHAT: nao pede camera/microfone
  if (chatOnly) {
    try {
      socket.emit("choose-name", {
        name: selectedName,
        audioOnly: true,
        speaker: false,
        chatOnly: true
      });
    } catch (err) {
      console.error("Erro ao entrar:", err);
      nameError.textContent = "Não consegui entrar na sala.";
      showToast("Não consegui entrar na sala.");
    }
    return;
  }

  // MODO AUDIO/VIDEO: pede permissao
  try {
    // Tenta com restricoes; se falhar, tenta o mais simples possivel (iOS 15)
    let constraints = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: audioOnly ? false : { facingMode: "user" }
    };
    try {
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e1) {
      constraints = { audio: true, video: audioOnly ? false : true };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
    }

    socket.emit("choose-name", {
      name: selectedName,
      audioOnly: audioOnly,
      speaker: speakerOn,
      chatOnly: false
    });
  } catch (err) {
    console.error("Erro de mídia:", err);
    const msg = err && err.name
      ? `Não consegui acessar câmera/microfone (${err.name}). Verifique as permissões.`
      : "Não consegui acessar câmera/microfone. Verifique as permissões.";
    nameError.textContent = msg;
    showToast(msg);
    dbg("getUserMedia falhou: " + (err && err.name) + " " + (err && err.message));
  }
});

socket.on("name-error", (msg) => {
  nameError.textContent = msg;
  showToast(msg);
});

socket.on("name-accepted", ({ name, roster: list }) => {
  myName = name;
  chatOnly = chatOnly || false;

  // limpa estado anterior
  peers.forEach((p) => { try { p.pc.close(); } catch (e) {} });
  peers.clear();
  roster.clear();
  videoGrid.innerHTML = "";
  tiles.clear();

  // monta o elenco
  list.forEach((p) => roster.set(p.id, p));

  showScreen("call-screen");
  myNameDisplay.textContent = name;
  countDisplay.textContent = `${roster.size}/${MAX_PARTICIPANTS}`;

  checkPerms(); // atualiza o status após a chamada conceder
  renderPeople();
  aplicarQualidade();
  showToast(chatOnly ? `Você está no chat como ${name}` : `Você está online como ${name}`);

  // cria meu próprio tile (apenas se nao for chat-only)
  if (!chatOnly) {
    createTile(socket.id, name, true);
  } else {
    // chat-only: abre o painel de chat automaticamente
    if (chatPanel) chatPanel.classList.remove("hidden");
  }

  // conecta com quem já estava na sala (apenas se nao for chat-only)
  if (!chatOnly) {
    roster.forEach((p, id) => {
      if (id === socket.id) return;
      if (p.chatOnly) return; // chat-only nao precisa de peer connection
      if (souEuQuemInicia(id)) offerTo(id);
    });
  }

  updateAudioOnlyButton();
  updateSpeakerButton();
});

// ---------- TILES DE VÍDEO ----------
function createTile(id, name, isLocal) {
  let tile = tiles.get(id);
  if (tile) return tile;

  tile = document.createElement("div");
  tile.className = "tile" + (isLocal ? " local" : "");
  tile.dataset.id = id;

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  if (isLocal) video.muted = true;
  tile.appendChild(video);

  const label = document.createElement("div");
  label.className = "tile-label";
  label.textContent = isLocal ? `${name} (você)` : name;
  tile.appendChild(label);

  const micBadge = document.createElement("div");
  micBadge.className = "mic-off-badge";
  micBadge.style.display = "none";
  micBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
  tile.appendChild(micBadge);

  const avatar = document.createElement("div");
  avatar.className = "tile-avatar";
  avatar.style.display = "none";
  avatar.innerHTML = `<div class="avatar-circle">${name[0]}</div><span>${isLocal ? "você" : name}</span>`;
  tile.appendChild(avatar);

  if (!isLocal) {
    const conn = document.createElement("div");
    conn.className = "conn-status";
    conn.style.display = "flex";
    conn.textContent = "conectando...";
    tile.appendChild(conn);
  }

  videoGrid.appendChild(tile);
  tiles.set(id, tile);

  if (isLocal && localStream) {
    video.srcObject = localStream;
  }

  return tile;
}

function showAvatarFor(id, show) {
  const tile = tiles.get(id);
  if (!tile) return;
  const video = tile.querySelector("video");
  const avatar = tile.querySelector(".tile-avatar");
  const label = tile.querySelector(".tile-label");
  if (show) {
    avatar.style.display = "flex";
    label.style.display = "none";
    video.style.display = "none";
  } else {
    avatar.style.display = "none";
    label.style.display = "flex";
    video.style.display = "block";
  }
}

function setMicBadge(id, off) {
  const tile = tiles.get(id);
  if (!tile) return;
  const badge = tile.querySelector(".mic-off-badge");
  badge.style.display = off ? "flex" : "none";
}

function removeTile(id) {
  const tile = tiles.get(id);
  if (tile) tile.remove();
  tiles.delete(id);
}

// ---------- STATUS ONLINE / LISTA DE PARTICIPANTES ----------
const ICON_MIC_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
const ICON_AUDIO_ONLY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
const ICON_SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';

function renderPeople() {
  peopleList.innerHTML = "";

  const list = [];

  // eu primeiro
  if (myName) {
    list.push({
      id: socket.id,
      name: myName,
      me: true,
      audioOnly,
      speaker: speakerOn,
      muted: !isMicOn
    });
  }
  // depois os demais
  roster.forEach((p, id) => {
    if (id === socket.id) return;
    list.push({ ...p, me: false, muted: !!p.muted });
  });

  peopleCount.textContent = list.length;
  countDisplay.textContent = `${list.length}/${MAX_PARTICIPANTS}`;

  list.forEach((p) => {
    const item = document.createElement("div");
    item.className = "person-item";

    const dot = document.createElement("i");
    dot.className = "p-dot";
    item.appendChild(dot);

    const name = document.createElement("span");
    name.className = "p-name";
    name.textContent = p.name;
    item.appendChild(name);

    if (p.me) {
      const tag = document.createElement("span");
      tag.className = "p-tag";
      tag.textContent = "VOCÊ";
      item.appendChild(tag);
    }

    if (p.audioOnly) {
      const ic = document.createElement("span");
      ic.className = "p-audio";
      ic.title = "Somente áudio";
      ic.innerHTML = ICON_AUDIO_ONLY;
      item.appendChild(ic);
    }

    if (p.speaker) {
      const ic = document.createElement("span");
      ic.className = "p-speaker";
      ic.title = "Viva voz";
      ic.innerHTML = ICON_SPEAKER;
      item.appendChild(ic);
    }

    if (p.muted) {
      const ic = document.createElement("span");
      ic.className = "p-muted";
      ic.title = "Microfone mudo";
      ic.innerHTML = ICON_MIC_OFF;
      item.appendChild(ic);
    }

    if (p.chatOnly) {
      const ic = document.createElement("span");
      ic.className = "p-chat";
      ic.title = "Somente chat";
      ic.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      item.appendChild(ic);
    }

    // estado da conexao de midia
    const conexao = peers.get(p.id);
    if (conexao && p.id !== socket.id) {
      const st = conexao.pc.connectionState;
      if (st !== "connected" && st !== "completed") {
        const tag = document.createElement("span");
        tag.className = "p-tag";
        tag.textContent = st === "failed" ? "FALHA" : "linkando";
        item.appendChild(tag);
      }
    }

    peopleList.appendChild(item);
  });
}

peopleBtn.addEventListener("click", () => {
  peoplePanel.classList.toggle("hidden");
  peopleBtn.classList.toggle("active");
});
peopleToggle.addEventListener("click", () => {
  peoplePanel.classList.add("hidden");
  peopleBtn.classList.remove("active");
});

// ---------- QUALIDADE ADAPTATIVA (aplicada em tempo real) ----------
let perfilAtual = null;

function aplicarQualidade() {
  const total = Math.max(1, roster.size);
  const q = perfilQualidade(total);
  perfilAtual = q;

  // 1) ajusta a captura da câmera
  if (localStream && !audioOnly) {
    const vt = localStream.getVideoTracks()[0];
    if (vt) {
      vt.applyConstraints({
        width: { ideal: q.w, max: q.w },
        height: { ideal: q.h, max: q.h },
        frameRate: { ideal: q.fps, max: q.fps }
      }).catch(() => {});
    }
  }

  // 2) limita o bitrate de envio em todas as conexões
  peers.forEach((peer) => {
    if (!peer.pc) return;
    peer.pc.getSenders().forEach((sender) => {
      if (!sender.track || sender.track.kind !== "video") return;
      try {
        const params = sender.getParameters();
        if (!params.encodings || !params.encodings.length) params.encodings = [{}];
        params.encodings[0].maxBitrate = q.kbps * 1000;
        params.encodings[0].maxFramerate = q.fps;
        sender.setParameters(params).catch(() => {});
      } catch (e) {}
    });
  });

  // 3) mostra na tela
  const badge = document.getElementById("qualityBadge");
  if (badge) {
    badge.textContent = audioOnly ? "ÁUDIO" : `${q.h}p`;
    badge.title = `Qualidade Sending: ${q.w}x${q.h} @${q.fps}fps · ${q.kbps}kbps (${total} participante${total > 1 ? "s" : ""})`;
  }
  renderPeople();
}

// ---------- RECONEXÃO AUTOMÁTICA (ICE restart) ----------
function reconectar(peer) {
  if (!peer || !peer.pc) return;
  try {
    if (typeof peer.pc.restartIce === "function") peer.pc.restartIce();
    peer.pc.createOffer()
      .then((offer) => peer.pc.setLocalDescription(offer))
      .then(() => {
        socket.emit("signal", { to: peer.id, signal: { type: "offer", sdp: peer.pc.localDescription } });
      })
      .catch(() => {});
  } catch (e) {}
}

// ---------- WEBRTC (MALHA) ----------

// Só UM lado pode iniciar a negociação, senão os dois oferecem ao mesmo
// tempo ("glare") e a chamada nunca estabelece. Regra determinística:
// o participante com o id MENOR sempre inicia.
function souEuQuemInicia(id) {
  return socket.id < id;
}

// Polite = o lado que cede em caso de colisão de ofertas.
function souPolite(id) {
  return socket.id > id;
}

function createPeer(id) {
  const pc = new RTCPeerConnection(ICE_CONFIG);
  const peer = {
    id,
    pc,
    name: roster.get(id)?.name || "",
    audioOnly: false,
    candidates: [],
    makingOffer: false,
    ignoreOffer: false,
    polite: souPolite(id),
    estado: "conectando"
  };
  peers.set(id, peer);

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("signal", { to: id, signal: { type: "ice", candidate: e.candidate } });
    }
  };

  pc.ontrack = (e) => {
    const tile = createTile(id, roster.get(id)?.name || "?", false);
    const video = tile.querySelector("video");

    // usa a stream do evento; se vier vazia, monta uma com a track
    const stream = (e.streams && e.streams[0]) || new MediaStream([e.track]);
    video.srcObject = stream;

    // alguns navegadores bloqueiam autoplay com som -> garante a reproducao
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => mostrarBloqueioDeReproducao(id));
    }

    showAvatarFor(id, false);
    atualizarEstadoPeers();
  };

  pc.onconnectionstatechange = () => {
    if (!pc) return;
    peer.estado = pc.connectionState;
    atualizarEstadoPeers();

    if (pc.connectionState === "connected" || pc.connectionState === "completed") {
      clearTimeout(peer.timer);
      if (peer.timerFallback) clearTimeout(peer.timerFallback);
    }
    if (pc.connectionState === "failed") {
      reconectar(peer);
    }
  };

  // quando o ICE falha, tenta renegociar em vez de simplesmente cair
  pc.oniceconnectionstatechange = () => {
    if (!pc) return;
    if (pc.iceConnectionState === "failed") {
      reconectar(peer);
    }
  };

  // WATCHDOG: se não conectar em 15s, renegocia
  peer.timerFallback = setTimeout(() => {
    if (!pc) return;
    if (pc.connectionState === "connected" || pc.connectionState === "completed") return;
    try { if (typeof pc.restartIce === "function") pc.restartIce(); } catch (e) {}
    if (souEuQuemInicia(id)) offerTo(id);
  }, 15000);

  // AVISO: se em 30s ainda não conectou, avisa o usuário
  peer.timerAviso = setTimeout(() => {
    if (!pc) return;
    if (pc.connectionState === "connected" || pc.connectionState === "completed") return;
    const nome = roster.get(id)?.name || "participante";
    showToast(`Ainda conectando com ${nome}. Se não sair, é firewall — use um servidor TURN.`);
  }, 30000);

  return peer;
}

// Atualiza o indicador de estado de cada participante
function atualizarEstadoPeers() {
  peers.forEach((peer, id) => {
    const tile = tiles.get(id);
    if (!tile) return;
    const st = peer.pc.connectionState;
    const badge = tile.querySelector(".conn-status");
    if (!badge) return;
    if (st === "connected" || st === "completed") {
      badge.style.display = "none";
    } else {
      badge.style.display = "flex";
      badge.textContent = st === "failed" ? "falha na conexão" : "conectando...";
      badge.classList.toggle("erro", st === "failed");
    }
  });
  renderPeople();
}

// O navegador pode bloquear a reproducao automatica com audio.
// Nesse caso mostra um aviso clicavel na tela.
function mostrarBloqueioDeReproducao(id) {
  const tile = tiles.get(id);
  if (!tile) return;
  const overlay = tile.querySelector(".play-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    return;
  }
  const box = document.createElement("div");
  box.className = "play-overlay";
  box.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round">
      <polygon points="6 3 20 12 6 21 6 3"></polygon>
    </svg>
    <span>Clique para ouvir</span>`;
  box.addEventListener("click", () => {
    tile.querySelectorAll("video").forEach((v) => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    });
    box.style.display = "none";
  });
  tile.appendChild(box);
}

async function offerTo(id) {
  let peer = peers.get(id);
  if (!peer) peer = createPeer(id);
  const pc = peer.pc;
  if (pc.signalingState !== "stable") {
    // ja tem offer local: espera um pouco e tenta de novo
    setTimeout(() => {
      if (pc.signalingState === "stable") offerTo(id);
    }, 400);
    return;
  }
  try {
    peer.makingOffer = true;
    await pc.setLocalDescription(await pc.createOffer());
    socket.emit("signal", { to: id, signal: { type: "offer", sdp: pc.localDescription } });
  } catch (e) {
    console.error("Erro ao criar offer:", e);
  } finally {
    peer.makingOffer = false;
  }
}

function closePeer(id) {
  const peer = peers.get(id);
  if (peer) {
    if (peer.timerFallback) clearTimeout(peer.timerFallback);
    if (peer.timerAviso) clearTimeout(peer.timerAviso);
    try { peer.pc.close(); } catch (e) {}
    peers.delete(id);
  }
  removeTile(id);
}

async function flushCandidates(peer) {
  for (const c of peer.candidates) {
    try { await peer.pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
  }
  peer.candidates = [];
}

socket.on("participant-joined", (p) => {
  roster.set(p.id, p);
  if (!p.chatOnly) {
    createTile(p.id, p.name, false);
    if (p.audioOnly) showAvatarFor(p.id, true);
    // só um dos lados inicia a oferta (o de id menor) - evita colisão
    // chat-only nao precisa de peer connection
    if (!chatOnly && !p.chatOnly && souEuQuemInicia(p.id)) offerTo(p.id);
  }
  renderPeople();
  aplicarQualidade();
  showToast(p.chatOnly ? `${p.name} entrou no chat` : `${p.name} está online`);
});

socket.on("participant-updated", (p) => {
  const existing = roster.get(p.id) || {};
  roster.set(p.id, { ...existing, ...p });
  if (p.audioOnly) showAvatarFor(p.id, true);
  renderPeople();
});

socket.on("participant-left", ({ id, name }) => {
  closePeer(id);
  roster.delete(id);
  tiles.delete(id);
  renderPeople();
  aplicarQualidade();
  showToast(`${name} ficou offline`);
});

socket.on("signal", async ({ from, signal }) => {
  let peer = peers.get(from);
  if (!peer) peer = createPeer(from);
  const pc = peer.pc;

  try {
    if (signal.type === "offer") {
      // ---- PERFECT NEGOTIATION ----
      // Se as duas pontas ofereceram ao mesmo tempo, o lado "impolite"
      // ignora a oferta rival e o lado "polite" recua (rollback).
      const colisao = peer.makingOffer || pc.signalingState !== "stable";
      peer.ignoreOffer = !peer.polite && colisao;
      if (peer.ignoreOffer) return;

      if (colisao) {
        try { await pc.setLocalDescription({ type: "rollback" }); } catch (e) {}
      }

      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      await pc.setLocalDescription(await pc.createAnswer());
      socket.emit("signal", { to: from, signal: { type: "answer", sdp: pc.localDescription } });
      await flushCandidates(peer);
    } else if (signal.type === "answer") {
      // a resposta só é válida se ESTAMOS esperando uma (estado "have-local-offer")
      if (pc.signalingState !== "have-local-offer") {
        if (!peer.polite) setTimeout(() => offerTo(from), 500);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      await flushCandidates(peer);
    } else if (signal.type === "ice") {
      if (!pc.remoteDescription) {
        peer.candidates.push(signal.candidate);
      } else {
        try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (e) {}
      }
    }
  } catch (e) {
    console.error("Erro no processamento do sinal:", e);
  }
});

// ---------- CONTROLES ----------
toggleMicBtn.addEventListener("click", () => {
  if (!localStream) return;
  const t = localStream.getAudioTracks()[0];
  if (!t) return;
  isMicOn = !isMicOn;
  t.enabled = isMicOn;
  toggleMicBtn.classList.toggle("active", isMicOn);
  toggleMicBtn.querySelector(".icon-mic-on").style.display = isMicOn ? "block" : "none";
  toggleMicBtn.querySelector(".icon-mic-off").style.display = isMicOn ? "none" : "block";
  setMicBadge(socket.id, !isMicOn);
  socket.emit("update-state", { audioOnly, speaker: speakerOn, muted: !isMicOn });
  renderPeople();
  showToast(isMicOn ? "Microfone ligado" : "Microfone desligado");
});

toggleCamBtn.addEventListener("click", () => {
  if (!localStream || audioOnly) return;
  const t = localStream.getVideoTracks()[0];
  if (!t) return;
  isCamOn = !isCamOn;
  t.enabled = isCamOn;
  toggleCamBtn.classList.toggle("active", isCamOn);
  toggleCamBtn.querySelector(".icon-cam-on").style.display = isCamOn ? "block" : "none";
  toggleCamBtn.querySelector(".icon-cam-off").style.display = isCamOn ? "none" : "block";
  showAvatarFor(socket.id, !isCamOn);
  showToast(isCamOn ? "Câmera ligada" : "Câmera desligada");
});

toggleAudioOnlyBtn.addEventListener("click", () => {
  audioOnly = !audioOnly;
  if (localStream) {
    localStream.getVideoTracks().forEach((t) => (t.enabled = !audioOnly));
  }
  showAvatarFor(socket.id, audioOnly);
  updateAudioOnlyButton();
  socket.emit("update-state", { audioOnly, speaker: speakerOn, muted: !isMicOn });
  renderPeople();
  aplicarQualidade();
  showToast(audioOnly ? "Agora é só áudio" : "Vídeo ativado");
});

function updateAudioOnlyButton() {
  toggleAudioOnlyBtn.classList.toggle("active", !audioOnly);
  toggleCamBtn.style.display = audioOnly ? "none" : "flex";
}

// ---------- VIVA VOZ ----------
function updateSpeakerButton() {
  toggleSpeakerBtn.classList.toggle("active", speakerOn);
  applySpeakerMode();
}

toggleSpeakerBtn.addEventListener("click", () => {
  speakerOn = !speakerOn;
  updateSpeakerButton();
  socket.emit("update-state", { audioOnly, speaker: speakerOn, muted: !isMicOn });
  renderPeople();
  showToast(speakerOn ? "Viva voz ativado" : "Viva voz desativado");
});

async function applySpeakerMode() {
  if (!speakerOn) return;
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const speakers = devices.filter((d) => d.kind === "audiooutput");
      if (speakers.length && HTMLMediaElement.prototype.setSinkId) {
        const target = speakers.find((d) => /speaker|alto|viva/i.test(d.label)) || speakers[0];
        tiles.forEach((tile) => {
          const v = tile.querySelector("video");
          if (v && v.setSinkId) v.setSinkId(target.deviceId).catch(() => {});
        });
      }
    }
  } catch (e) {}
}

// ---------- CHAT ----------
function addMessage(fromName, mine, body) {
  const wrap = document.createElement("div");
  wrap.className = "msg";

  const head = document.createElement("div");
  head.className = "msg-head";
  head.textContent = `${mine ? "Você" : fromName} · ${nowTime()}`;
  wrap.appendChild(head);

  if (body.type === "text") {
    const b = document.createElement("div");
    b.className = "msg-bubble" + (mine ? " mine" : "");
    b.textContent = body.text;
    wrap.appendChild(b);
  } else if (body.type === "file") {
    const f = document.createElement("div");
    f.className = "msg-file";
    let media;
    if (body.fileType.startsWith("image/")) {
      media = document.createElement("img");
    } else {
      media = document.createElement("video");
      media.controls = true;
    }
    media.src = body.data;
    f.appendChild(media);
    const fn = document.createElement("div");
    fn.className = "file-name";
    fn.textContent = `${body.fileName} · ${(body.fileSize / 1024).toFixed(0)} KB`;
    f.appendChild(fn);
    wrap.appendChild(f);
  }

  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

socket.on("chat", (msg) => {
  const mine = msg.fromId === socket.id;
  addMessage(msg.from, mine, msg);
});

socket.on("chat-error", (msg) => {
  showToast(msg || "Mensagem recusada pelo servidor");
});

function sendText() {
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit("chat", { type: "text", text });
  chatInput.value = "";
}

sendBtn.addEventListener("click", sendText);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendText();
});

// ---------- ENVIO DE ARQUIVOS ----------
attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileInput.value = "";
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    showToast("Só são aceitos fotos ou vídeos.");
    return;
  }

  const limit = isImage ? MAX_PHOTO : MAX_VIDEO;
  const label = isImage ? "1 MB" : "2 MB";
  if (file.size > limit) {
    showToast(`Arquivo grande demais. Máximo ${label}.`);
    return;
  }

  checkResolution(file)
    .then((ok) => {
      if (!ok) {
        showToast("Resolução acima de 720p. Escolha outra.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("chat", {
          type: "file",
          fileType: file.type,
          fileName: file.name,
          fileSize: file.size,
          data: reader.result
        });
      };
      reader.readAsDataURL(file);
    })
    .catch(() => {
      showToast("Não consegui ler o arquivo.");
    });
});

function checkResolution(file) {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.naturalWidth <= MAX_W && img.naturalHeight <= MAX_H);
      };
      img.onerror = () => resolve(false);
      img.src = url;
    } else {
      const url = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(vid.videoWidth <= MAX_W && vid.videoHeight <= MAX_H);
      };
      vid.onerror = () => resolve(false);
      vid.src = url;
    }
  });
}

// ---------- CHAT TOGGLE ----------
chatBtn.addEventListener("click", () => chatPanel.classList.toggle("hidden"));
chatToggle.addEventListener("click", () => chatPanel.classList.add("hidden"));

// ---------- SAIR DA CHAMADA (apaga tudo) ----------
exitBtn.addEventListener("click", exitAndWipe);

function exitAndWipe() {
  // 1) para a mídia
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  // 2) fecha todas as conexões
  peers.forEach((p) => { try { p.pc.close(); } catch (e) {} });
  peers.clear();
  roster.clear();

  // 3) limpa o DOM (vídeos e conversa)
  videoGrid.innerHTML = "";
  chatMessages.innerHTML = "";
  tiles.clear();
  chatInput.value = "";
  fileInput.value = "";

  // 4) limpa armazenamento e cookies
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  try {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
    });
  } catch (e) {}

  // 5) zera o estado (memória volátil)
  myName = null;
  selectedName = null;
  audioOnly = false;
  speakerOn = true;
  isMicOn = true;
  isCamOn = true;
  chatOnly = false;

  // 6) avisa o servidor
  try { socket.emit("leave"); } catch (e) {}

  // 7) atualiza a lista de online na tela inicial
  try { socket.emit("list-names"); } catch (e) {}

  showToast("Sessão encerrada. Tudo apagado.");

  // 7) tenta fechar o navegador/aba; se não der, some com a página
  setTimeout(() => {
    try { window.open("", "_self"); } catch (e) {}
    try { window.close(); } catch (e) {}
    try { location.replace("about:blank"); } catch (e) {}
  }, 400);
}

// ---------- PROTEÇÃO: NÃO RODAR EM SEGUNDO PLANO ----------
document.addEventListener("visibilitychange", () => {
  if (document.hidden && callScreen.classList.contains("active")) {
    exitAndWipe();
  } else if (!document.hidden && callScreen.classList.contains("active") && !socket.connected) {
    exitAndWipe();
  }
});

window.addEventListener("pagehide", () => {
  if (callScreen.classList.contains("active")) {
    try { socket.emit("leave"); } catch (e) {}
  }
});

window.addEventListener("blur", () => document.body.classList.add("hidden-content"));
window.addEventListener("focus", () => document.body.classList.remove("hidden-content"));

window.addEventListener("beforeunload", () => {
  try { socket.emit("leave"); } catch (e) {}
});

// ---------- PROTEÇÃO: PROIBIR PRINT ----------
function blockCapture() {
  captureBlock.classList.add("show");
  document.body.classList.add("hidden-content");
  showToast("Captura de tela bloqueada");
  setTimeout(() => {
    captureBlock.classList.remove("show");
    if (document.hasFocus()) document.body.classList.remove("hidden-content");
  }, 1500);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "PrintScreen") { e.preventDefault(); blockCapture(); return; }
  if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); blockCapture(); return; }
  if (e.key === "F12") { e.preventDefault(); showToast("Ferramentas bloqueadas"); return; }
  if (e.ctrlKey && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) {
    e.preventDefault(); showToast("Ferramentas bloqueadas"); return;
  }
  if (e.metaKey && e.shiftKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); blockCapture(); }
});

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());
document.addEventListener("selectstart", (e) => e.preventDefault());


// ---------- DUPLO TOQUE PARA ENCERRAR ----------
// Toque 2x rapidamente em qualquer lugar da tela para fechar tudo.
let ultimoToque = 0;
let toqueContador = 0;
let toqueTimer = null;

function fecharPorDuploToque() {
  const overlay = document.getElementById("doubleTapOverlay");
  if (overlay) overlay.classList.add("show");
  setTimeout(() => {
    exitAndWipe();
    setTimeout(() => {
      try { window.open("", "_self"); } catch (e) {}
      try { window.close(); } catch (e) {}
      try { location.replace("about:blank"); } catch (e) {}
    }, 300);
  }, 800);
}

document.addEventListener("touchend", (e) => {
  const agora = Date.now();
  if (agora - ultimoToque < 350) {
    toqueContador++;
    if (toqueContador >= 2) {
      toqueContador = 0;
      fecharPorDuploToque();
      return;
    }
  } else {
    toqueContador = 1;
  }
  ultimoToque = agora;
  clearTimeout(toqueTimer);
  toqueTimer = setTimeout(() => { toqueContador = 0; }, 400);
}, { passive: true });

// duplo clique do mouse tambem funciona
let ultimoClique = 0;
document.addEventListener("dblclick", () => {
  fecharPorDuploToque();
});

// ---------- CORRECAO DA TELA BRANCA AO MINIMIZAR ----------
// Ao minimizar/trocar de aba, fecha tudo e navega para about:blank
// (evita a tela branca que exigia fechar e abrir de novo)
const _visibilityHandler = document.visibilityState;
document.addEventListener("visibilitychange", () => {
  if (document.hidden && callScreen.classList.contains("active")) {
    exitAndWipe();
    setTimeout(() => {
      try { location.replace("about:blank"); } catch (e) {}
    }, 500);
  }
});

// ---------- INÍCIO ----------
socket.emit("list-names");
checkPerms();

// ---------- CONFIGURAÇÃO DO SERVIDOR ----------
// Busca ICE/TURN, limite e exigência de token
enterBtn.disabled = true;
enterBtn.textContent = "Carregando...";

fetch("/api/config", { cache: "no-store" })
  .then((r) => r.json())
  .then((cfg) => {
    if (Array.isArray(cfg.iceServers) && cfg.iceServers.length) {
      ICE_CONFIG = { iceServers: cfg.iceServers, iceCandidatePoolSize: 4 };
    }
    if (cfg.maxParticipants) MAX_PARTICIPANTS = cfg.maxParticipants;
    if (cfg.requiresToken && !ACCESS_TOKEN) {
      bloqueado("Este acesso exige um código de convite. Peça o link com quem te convidou.");
      return;
    }
    enterBtn.disabled = false;
    enterBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="m22 8-6 4 6 4V8Z" />
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
      Entrar na chamada`;
  })
  .catch(() => {
    enterBtn.disabled = false;
    enterBtn.textContent = "Entrar na chamada";
    showToast("Não consegui carregar a configuração do servidor");
  });

function bloqueado(mensagem) {
  const box = document.getElementById("nameError");
  if (box) {
    box.innerHTML = `<strong>${mensagem}</strong>`;
    box.style.color = "var(--danger)";
  }
  enterBtn.disabled = true;
  enterBtn.textContent = "Acesso restrito";
  document.querySelectorAll(".name-item").forEach((b) => (b.disabled = true));
  showToast(mensagem);
}

// servidor recusou o acesso
socket.on("access-denied", (msg) => {
  bloqueado(msg || "Acesso negado.");
});

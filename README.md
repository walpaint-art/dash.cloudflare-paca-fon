# Videochamada Web

Chamada de vídeo e áudio **pelo navegador**. Nada é instalado no aparelho, nada é salvo, sem histórico.

**Sala única · até 10 participantes · WebRTC ponto a ponto**

---

## O que é

- 🎥 **Vídeo e áudio** em malha (P2P) via **WebRTC**
- 🔐 **Criptografia de ponta a ponta** (DTLS-SRTP) — a mídia não passa pelo servidor
- 🗣️ **Linguagem Alfa** como identidade: ALPHA, BRAVO, CHARLIE… (10 nomes)
- 💬 **Chat** com texto, fotos (até 1 MB) e vídeos (até 2 MB), máx. 720p
- 🎚️ Modo **somente áudio** e **viva voz**
- 👥 Painel de **participantes online** em tempo real
- 🧹 Botão **"Sair da chamada"** que encerra, fecha o navegador e limpa a memória
- 🚫 Bloqueio de print (PrintScreen, F12, Ctrl+Shift+S)
- 📵 **Não roda em segundo plano**: minimizar/trocar de aba apaga a sessão na hora
- 🚫 **Nada é salvo** no dispositivo: sem cache, sem storage, sem cookies, sem histórico

---

## Rodando local

```bash
npm install
npm start
```

Acesse **http://localhost:3000**

> Câmera e microfone só funcionam em `localhost` ou `https://`.

---

## Publicando na internet

- 📘 **[MANUAL.md](MANUAL.md)** — como usar
- 🚀 **[DEPLOY.md](DEPLOY.md)** — Render, Railway, VPS, Docker, TURN, checklist

Resumo do essencial:

```env
# .env
ACCESS_TOKEN=token_forte_aqui
ALLOWED_ORIGINS=https://seu-dominio.com.br
TURN_URL=turn:seu-dominio.com.br:3478,turn:seu-dominio.com.br:3478?transport=tcp
TURN_USERNAME=usuario
TURN_CREDENTIAL=senha
```

Link de acesso: `https://seu-dominio.com.br/?token=SEU_TOKEN`

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + JavaScript puro, WebRTC |
| Backend | Node.js 20+ · Express · Socket.IO |
| Sinalização | WebSocket (Socket.IO) — offer / answer / ICE |
| Mídia | WebRTC P2P (malha) · UDP · DTLS-SRTP · STUN/TURN |
| Codecs | VP8 / VP9 / H.264 (vídeo) · Opus (áudio) |
| Chat | WebSocket + JSON · arquivos em Base64 |
| Infra | Docker · PM2 · Caddy / Nginx · coturn (TURN) |

**Qualidade adaptativa:** a resolução cai sozinha conforme entra mais gente (720p → 540p → 360p → 180p).

---

## Estrutura

```
.
├── server.js            # servidor (sinalização + chat + presença)
├── public/
│   ├── index.html       # interface
│   ├── main.js          # WebRTC, chat, permissões, qualidade adaptativa
│   └── style.css        # visual
├── MANUAL.md            # manual de uso
├── DEPLOY.md            # guia de publicação
├── Dockerfile
├── render.yaml
├── Caddyfile
├── nginx.conf
├── ecosystem.config.cjs
└── .env.example
```

---

## Licença

MIT

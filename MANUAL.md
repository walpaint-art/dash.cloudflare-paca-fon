# Manual de Uso — Videochamada Web

Chamada de vídeo/áudio pelo navegador. Nada é instalado no aparelho, nada é salvo,
sem histórico. **Sala única com até 10 participantes.**

---

## 1. Requisitos

- Navegador: **Chrome, Edge ou Firefox** (atualizado)
- Câmera e microfone (pode usar **só áudio**, sem câmera)
- Internet (para llamar pessoas em outros lugares)
- **Node.js 18+** instalado (só para rodar o servidor)

---

## 2. Como rodar no computador

Abra o terminal na pasta do projeto e rode:

```bash
npm install
npm start
```

Depois abra no navegador: **http://localhost:3000**

> Para a câmera funcionar, o endereço precisa ser `localhost` ou `https://`.
> Se abrir pelo IP da rede (ex: `http://192.168.0.10:3000`), o navegador vai
> **bloquear a câmera** por falta de HTTPS.

### Para fechar o servidor
No terminal, aperte **Ctrl + C**.

---

## 3. Como usar (passo a passo)

### Passo 1 — Abrir o app
Acesse o link. Vai aparecer a tela inicial com:
- **ONLINE AGORA** — quem já está na sala
- A grade com os **10 nomes** (ALPHA, BRAVO, CHARLIE...)

### Passo 2 — Liberar câmera e microfone
Na seção **PERMISSÕES DO DISPOSITIVO**:
- Clique em **Ativar** na **Câmera** e no **Microfone** (ou no botão azul **"Ativar câmera e microfone"**)
- Aceite a janela do navegador que vai aparecer
- O status vira **verde "Ativada"**

> Se aparecer **"Bloqueada"**: clique no ícone de cadeado 🔒 da barra de endereço →
> **Configurações do site** → **Permitir** → recarregue a página.

### Passo 3 — Escolher seu nome
- Nomes **com bolinha verde** já estão em uso (não dá para clicar)
- Escolha um nome **livre** (fica azul quando selecionado)

### Passo 4 — Ajustar as opções (opcional)
- **Somente áudio (sem câmera)** — se não quiser mostrar vídeo
- **Iniciar com viva voz ativado** — já vem ligado

### Passo 5 — Entrar
Clique em **Entrar na chamada**. Você aparece na lista de participantes como **online**.

### Passo 6 — Convidar
Na sala, o botão **Conversa** abre o painel de mensagens, mas o link de acesso é
o mesmo endereço do app. Compartilhe o **link** com a outra pessoa.

---

## 4. Controles da chamada

| Botão | Função |
|---|---|
| 🎤 Microfone | Liga / desliga seu áudio |
| 📷 Câmera | Liga / desliga seu vídeo |
| 🔊 Somente áudio | Passa a chamada para voz |
| 🔊 Viva voz | Liga / desliga o som no alto-falante |
| 💬 Conversa | Abre/fecha o painel de mensagens |
| 👥 Participantes | Abre/fecha a lista de quem está online |
| 🗑 **Sair da chamada** | Encerra e **apaga tudo** (ver item 7) |

---

## 5. Conversa (chat)

- **Texto**: digite e aperte **Enter** (ou o botão ➤)
- **Foto**: botão 📎 → até **1 MB**
- **Vídeo**: botão 📎 → até **2 MB**
- Resolução máxima: **720p** (o app recusa arquivos maiores)

---

## 6. Regras da sala

- **1 sala**, até **10 participantes** ao mesmo tempo
- Cada pessoa usa **1 nome** (os 10 nomes da Linguagem Alfa)
- A qualidade do vídeo se ajusta sozinha:
  - 2 pessoas → **720p**
  - 3–4 pessoas → **540p**
  - 5 pessoas → **360p**
  - 10 pessoas → **180p**

---

## 7. Privacidade e segurança

O app é feito para **não deixar rastro**:

- ❌ Nada é salvo no celular/computador (sem cache, sem storage, sem cookies)
- ❌ Sem histórico de chamadas ou de conversas
- ✅ Ao **minimizar a janela, trocar de aba/app ou hibernar**, a sessão é
  **apagada na hora** e você é expulso
- ✅ O botão **Sair da chamada** encerra, fecha o navegador e limpa a memória
- ✅ A mídia é **criptografada de ponta a ponta** (DTLS-SRTP)

> **Limite honesto:** o bloqueio de print no navegador é uma barreira, não uma
> trava absoluta. Ferramentas do sistema operacional ainda podem capturar a tela.
> O que é garantido é que **não fica nada salvo** no aparelho.

---

## 8. Problemas comuns

| Sintoma | O que fazer |
|---|---|
| **Chat funciona mas áudio/vídeo não** | Clique em **"Clique para ouvir"** no quadro do participante (o navegador bloqueou o autoplay). Se ficar em "conectando...", é firewall → precisa de **TURN** |
| Quadro fica em "conectando..." | Bloqueio de rede. Teste com o celular no **4G** (desligue o Wi-Fi). Se funcionar, é a rede da empresa bloqueando → TURN resolve |
| "Precisa de HTTPS" | Acesse por `localhost` ou publique com SSL |
| "Bloqueada" nas permissões | Libere nas configurações do site e recarregue |
| "Sem dispositivo" | Conecte a câmera/microfone no aparelho |
| "Em uso por outro app" | Feche Zoom, Teams, Meet etc. que usam a câmera |
| Não abre popup de permissão | Foi negado antes: libere nas configurações do navegador |
| A outra pessoa não conecta | Precisa de servidor **TURN** (ver `DEPLOY.md`) |
| Vídeo travando | Normal acima de 4–5 pessoas (a qualidade cai sozinha) |

### Diagnóstico avançado
No Chrome/Edge abra `chrome://webrtc-internals` **antes** de entrar na chamada.
 ali você vê o tipo de candidato ICE usado:
- `host` → vocês estão na mesma rede ✅
- `srflx` → STUN funcionou ✅
- `relay` → precisou de TURN
- **sem candidatos** → o navegador não conseguiu gerar nenhum (problema de rede/máquina)

---

## 9. Publicar na internet

O guia completo está no arquivo **`DEPLOY.md`** (Render, Railway, VPS, Docker,
TURN, checklist). Resumo do essencial:

### O que é obrigatório
- **HTTPS** — sem ele o navegador bloqueia câmera e microfone
- **Domínio** apontando para o servidor
- **TURN** (recomendado) — sem ele, redes restritivas não conectam
- **ACCESS_TOKEN** (recomendado) — impede entrada de quem não tem o link

### Configuração (crie um arquivo `.env` ao lado do `package.json`)
```env
PORT=3000
ACCESS_TOKEN=cole_aqui_um_token_forte
ALLOWED_ORIGINS=https://seu-dominio.com.br
TURN_URL=turn:seu-dominio.com.br:3478,turn:seu-dominio.com.br:3478?transport=tcp
TURN_USERNAME=usuario
TURN_CREDENTIAL=senha
MAX_PARTICIPANTS=10
```

Gere um token forte:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### Link de acesso
```
https://seu-dominio.com.br/?token=SEU_TOKEN
```

### Opções mais rápidas
| Serviço | Como |
|---|---|
| **Render** | Conectar o GitHub → `npm ci` → `node server.js` → health `/health` |
| **Railway** | Deploy from GitHub (usa o `Procfile` automaticamente) |
| **Docker** | `docker build -t videochamada .` e `docker run -p 3000:3000 --env-file .env` |

### Comandos úteis
```bash
npm start            # inicia
npm run dev          # inicia com recarga automática
curl http://localhost:3000/health   # verifica se está vivo
```

> **Nunca** versione o arquivo `.env` com senhas reais. O `.gitignore` já o ignora.

---

## 10. Resumo técnico (para o administrador / TI)

- **Frontend**: HTML + JavaScript puro, WebRTC
- **Backend**: Node.js + Express + Socket.IO (só sinalização)
- **Sinalização**: WebSocket (Socket.IO) — offer / answer / ICE
- **Mídia**: WebRTC P2P (malha), UDP, DTLS-SRTP, STUN
- **Codecs**: VP8/VP9/H.264 (vídeo) + Opus (áudio)
- **Chat**: WebSocket + JSON, arquivos em Base64
- **Configuração**: arquivo `.env` (token, TURN, origens, limite)
- **Endpoints**: `/health` (status), `/api/config` (ICE + limites)
- **Proteções**: rate limit por IP, validação de payload no servidor,
  headers de segurança (HSTS, nosniff, Permissions-Policy), sanitização de texto
- **Sem**: banco de dados, autenticação de usuário, TURN embutido, SFU

### Arquivos de deploy no projeto
| Arquivo | Para quê |
|---|---|
| `Dockerfile` / `.dockerignore` | Container |
| `render.yaml` | Deploy no Render |
| `Procfile` | Heroku / Railway |
| `Caddyfile` | Proxy reverso com HTTPS automático |
| `nginx.conf` | Proxy reverso com Nginx |
| `ecosystem.config.cjs` | Gerenciador PM2 na VPS |
| `.env.example` | Modelo de configuração |
| `DEPLOY.md` | Guia de publicação passo a passo |

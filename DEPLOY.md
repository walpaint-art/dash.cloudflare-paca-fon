# Guia de Publicação — Videochamada Web

Como colocar o app **no ar**, com HTTPS e acesso protegido.

---

## Antes de tudo: o que é obrigatório

| Item | Por quê | Como resolver |
|---|---|---|
| **HTTPS** | O navegador **bloqueia** câmera/microfone fora de `localhost` | certificado grátis (Caddy/Let's Encrypt/Cloudflare) |
| **Domínio** | Endereço bonito e confiável | registro de domínio (R$40/ano) |
| **TURN (recomendado)** | Sem ele, ~15% das redes (empresa, 4G, VPN) **não conecta** | coturn (grátis) ou serviço pago |
| **Token (recomendado)** | Impede que qualquer pessoa com o link entre | `.env` → `ACCESS_TOKEN` |

---

## Caminho 1 — Render.com (mais rápido, tem HTTPS automático)

1. Suba o projeto para o **GitHub**
2. Em [render.com](https://render.com) → **New → Web Service** → conecte o repositório
3. Preencha:
   - **Runtime:** Node
   - **Build Command:** `npm ci`
   - **Start Command:** `node server.js`
   - **Health Check Path:** `/health`
4. Em **Environment**, adicione:
   - `ACCESS_TOKEN` → clique em *Generate* (ele cria uma senha)
   - `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` → se tiver TURN
5. Deploy. Em ~2 minutos o app fica no ar em `https://seu-app.onrender.com`
6. **Link de acesso:** `https://seu-app.onrender.com/?token=SUA_SENHA`

> ⚠️ O plano **free** do Render hiberna o app após 15 min sem uso (dorme e acorda em ~1 min).
> Para não ter hiccup, use o plano pago (US$ 7/mês) ou o **Caminho 3**.

---

## Caminho 2 — Railway.app

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Ele detecta o `Procfile` automaticamente (`web: node server.js`)
3. Em **Variables**, adicione `ACCESS_TOKEN`, `TURN_*`
4. **Settings → Networking → Generate Domain** → gera um domínio HTTPS
5. Link: `https://seu-app.up.railway.app/?token=SUA_SENHA`

---

## Caminho 3 — VPS própria (mais controle, melhor custo)

**Requisitos:** um servidor Linux (Ubuntu) com 1 GB de RAM, um domínio apontando para ele.

### 3.1 Instalar o Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3.2 Copiar o projeto
```bash
sudo mkdir -p /opt/videochamada
cd /opt/videochamada
# copie os arquivos (git clone, scp, ou WinSCP)
npm ci --omit=dev
```

### 3.3 Configurar
```bash
nano .env
```
```env
PORT=3000
ACCESS_TOKEN=cole_aqui_um_token_forte
TURN_URL=turn:seu-turn.com:3478,turn:seu-turn.com:3478?transport=tcp
TURN_USERNAME=usuario
TURN_CREDENTIAL=senha
```

Gere um token forte:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### 3.4 Rodar com PM2 (reinicia sozinho se cair)
```bash
sudo npm install -g pm2
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # segue a instrução que ele mostrar
```

### 3.5 HTTPS com Caddy (o mais fácil)
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Edite o Caddyfile:
```bash
sudo nano /etc/caddy/Caddyfile
```
```caddy
seu-dominio.com.br {
    reverse_proxy 127.0.0.1:3000
}
```
```bash
sudo systemctl reload caddy
```

✅ Pronto: `https://seu-dominio.com.br` já funciona com **certificado automático**.

### 3.6 Alternativa com Nginx
Se já usa Nginx, copie o `nginx.conf` do projeto:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/chamada
sudo ln -s /etc/nginx/sites-available/chamada /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/chamada   # ajuste o domínio e os caminhos do certificado
sudo certbot --nginx -d seu-dominio.com.br
sudo nginx -t && sudo systemctl reload nginx
```

---

## Caminho 4 — Docker (qualquer ambiente)

```bash
# Build
docker build -t videochamada .

# Rodar com arquivo .env
docker run -d --name videochamada \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  videochamada

# Ver logs
docker logs -f videochamada
```

Com Nginx ou Caddy na frente (compose):
```yaml
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    expose: ["3000"]
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [app]
volumes:
  caddy_data:
```

---

## Montando um servidor TURN (coturn)

Sem TURN, quem estiver em rede restritiva **não conecta**. O coturn é gratuito.

### Instalar (no mesmo VPS)
```bash
sudo apt install -y coturn
```

### Configurar
```bash
sudo nano /etc/turnserver.conf
```
```ini
listening-port=3478
tls-listening-port=5349
realm=seu-dominio.com.br
# coturn fica com as portas 49152-65535 UDP
min-port=49152
max-port=65535

# Long-term credential
lt-cred-mech
user=usuario:senhaforte

# IMPORTANTE: não abra o TURN para o público sem usar credencial
no-multicast-peers
no-loopback-peers
```

```bash
sudo systemctl restart coturn
```

### Liberar o firewall
```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 49152:65535/udp
```

### Apontar no `.env`
```env
TURN_URL=turn:seu-dominio.com.br:3478,turn:seu-dominio.com.br:3478?transport=tcp
TURN_USERNAME=usuario
TURN_CREDENTIAL=senhaforte
```

Reinicie o app:
```bash
pm2 restart videochamada-web
```

---

## Checklist final antes de divulgar

- [ ] Abre em `https://` (câmera e microfone liberados)
- [ ] `https://seu-dominio.com.br/health` retorna `{"ok":true}`
- [ ] `ACCESS_TOKEN` definido e o link tem `?token=...`
- [ ] `ALLOWED_ORIGINS` preenchido com seu domínio
- [ ] TURN configurado e testado
- [ ] Testou com **2 dispositivos diferentes** e **redes diferentes** (ex: 4G e Wi-Fi)
- [ ] Testou entrar **sem** o token (deve bloquear)
- [ ] Firewall liberado (3478 tcp/udp, 49152-65535 udp)
- [ ] Backup do `.env` em local seguro (é o que tem as senhas)

---

## Como verificar se está tudo certo

```bash
# 1. Servidor vivo?
curl https://seu-dominio.com.br/health

# 2. HTTPS funcionando?
curl -I https://seu-dominio.com.br | grep -i strict-transport

# 3. Token bloqueando sem senha?
# (abra o link sem ?token= e confirme que aparece "Acesso restrito")
```

---

## Monitoramento (opcional)

Cadastre o `/health` no **UptimeRobot** (grátis) ou **Better Stack** para ser
avisado se o app cair.

Os logs ficam em:
- PM2: `pm2 logs videochamada-web` / `./logs/`
- Docker: `docker logs -f videochamada`
- Render/Railway: painel do serviço

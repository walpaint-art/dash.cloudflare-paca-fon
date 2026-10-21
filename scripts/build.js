// build.js - prepara a pasta dist/ pronta para upload em qualquer servidor
// Uso: npm run build
// Resultado: pasta dist/ com tudo que precisa ser enviado ao servidor

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const dist = join(root, "dist");

// limpa dist
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
mkdirSync(join(dist, "public"), { recursive: true });

const arquivos = [
  "server.js",
  "package.json",
  "package-lock.json",
  "MANUAL.md",
  "README.md",
  "DEPLOY.md",
  ".env.example",
  "Dockerfile",
  "Caddyfile",
  "nginx.conf",
  "Procfile",
  "render.yaml",
  "ecosystem.config.cjs",
  "start.bat"
];

for (const a of arquivos) {
  const origem = join(root, a);
  const destino = join(dist, a);
  if (existsSync(origem)) {
    cpSync(origem, destino);
    console.log("  + " + a);
  } else {
    console.log("  - " + a + " (nao encontrado, pulando)");
  }
}

// copia a pasta public inteira
cpSync(join(root, "public"), join(dist, "public"), { recursive: true });
console.log("  + public/ (index.html, main.js, style.css)");

// valida o .env (nao pode ir com segredos)
const env = readFileSync(join(root, ".env"), "utf8");
const envAtivo = env.split(/\r?\n/).filter(l => !l.trim().startsWith("#") && l.includes("="));
const segredos = envAtivo.filter(l => /^(ACCESS_TOKEN|TURN_USERNAME|TURN_CREDENTIAL|ALLOWED_ORIGINS)\s*=\s*\S+/.test(l.trim()));
if (segredos.length) {
  console.log("\n  AVISO: seu .env contem segredos preenchidos:");
  segredos.forEach(s => console.log("    - " + s.trim().split("=")[0]));
  console.log("  O .env NAO foi copiado para dist/ (esta no .gitignore).");
  console.log("  Copie o .env.example para .env no servidor e preencha la.");
} else {
  console.log("\n  .env sem segredos (OK para distribuicao).");
}

console.log("\nCompilacao concluida. Pasta pronta: dist/");
console.log("Para subir: copie a pasta dist/ para o servidor e rode:");
console.log("  npm install");
console.log("  npm start");
console.log("");
console.log("Ou use: npm run pack  (gera videochamada-web.zip)");

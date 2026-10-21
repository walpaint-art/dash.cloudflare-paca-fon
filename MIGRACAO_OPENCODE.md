# Migração do OpenCode para outro PC

## O que precisa ser migrado

### 1. Configuração principal (OBRIGATÓRIO)
**Arquivo:** `C:\Users\Combatente\.config\opencode\opencode.json`

Conteúdo atual:
```json
{
  "mcp": {
    "rea": {
      "type": "local",
      "command": ["cmd.exe", "/d", "/c", "npx", "-y", "rea-agents@6.7.0", "mcp"],
      "enabled": true
    }
  }
}
```

**No notebook:** crie a pasta e o arquivo no mesmo caminho:
```
C:\Users\SEU_USUARIO\.config\opencode\opencode.json
```

### 2. Configurações do desktop (OPCIONAL)
**Arquivo:** `C:\Users\Combatente\AppData\Roaming\ai.opencode.desktop\opencode.settings`

Conteúdo atual:
```json
{
  "firstLaunchOnboardingComplete": true,
  "windowIds": ["b678fca7-4eec-40dc-8f7c-94220264b3d7"],
  "backgroundColor": "#191e29"
}
```

**No notebook:** copie para o mesmo caminho:
```
C:\Users\SEU_USUARIO\AppData\Roaming\ai.opencode.desktop\opencode.settings
```

### 3. Preferências (OPCIONAL)
**Arquivo:** `C:\Users\Combatente\AppData\Roaming\ai.opencode.desktop\Preferences`

Contém dicionário de spellcheck em português (pt-BR).

**No notebook:** copie para o mesmo caminho.

---

## O que NÃO precisa migrar

| Arquivo/Pasta | Por quê |
|---|---|
| `service.json` | Contém senha do servidor (será regenerada) |
| `opencode.db` | Banco de dados de sessões (muito grande, 17MB+) |
| `Cache/` | Cache do navegador (será recriado) |
| `Code Cache/` | Cache de código (será recriado) |
| `logs/` | Logs antigos |
| `shell/` | Histórico de comandos |

---

## Passo a passo no notebook

### 1. Instalar o OpenCode
Baixe e instale a versão desktop do OpenCode no notebook:
- **Executável:** `opencode-desktop-win-x64.exe` (já está no seu Desktop)
- Ou baixe de: https://opencode.ai

### 2. Criar as pastas de configuração
```powershell
# PowerShell no notebook
New-Item -ItemType Directory -Path "$env:USERPROFILE\.config\opencode" -Force
New-Item -ItemType Directory -Path "$env:APPDATA\ai.opencode.desktop" -Force
```

### 3. Copiar os arquivos
Copie do PC atual para o notebook:
```
opencode.json  →  C:\Users\SEU_USUARIO\.config\opencode\opencode.json
opencode.settings  →  C:\Users\SEU_USUARIO\AppData\Roaming\ai.opencode.desktop\opencode.settings
Preferences  →  C:\Users\SEU_USUARIO\AppData\Roaming\ai.opencode.desktop\Preferences
```

### 4. Abrir o OpenCode
O OpenCode vai ler as configs automaticamente.

---

## Script de migração (automático)

Salve este script como `migrar_opencode.ps1` e rode no PC atual:

```powershell
$dest = "C:\Users\Combatente\Desktop\opencode-config-backup"
New-Item -ItemType Directory -Path $dest -Force | Out-Null

# copia os arquivos de config
Copy-Item "$env:USERPROFILE\.config\opencode\opencode.json" "$dest\opencode.json" -Force
Copy-Item "$env:APPDATA\ai.opencode.desktop\opencode.settings" "$dest\opencode.settings" -Force
Copy-Item "$env:APPDATA\ai.opencode.desktop\Preferences" "$dest\Preferences" -Force

Write-Host "Backup criado em: $dest"
Write-Host "Copie essa pasta para o notebook e siga as instrucoes do MIGRACAO_OPENCODE.md"
```

No notebook, rode:
```powershell
$src = "C:\caminho\para\opencode-config-backup"
New-Item -ItemType Directory -Path "$env:USERPROFILE\.config\opencode" -Force | Out-Null
New-Item -ItemType Directory -Path "$env:APPDATA\ai.opencode.desktop" -Force | Out-Null
Copy-Item "$src\opencode.json" "$env:USERPROFILE\.config\opencode\opencode.json" -Force
Copy-Item "$src\opencode.settings" "$env:APPDATA\ai.opencode.desktop\opencode.settings" -Force
Copy-Item "$src\Preferences" "$env:APPDATA\ai.opencode.desktop\Preferences" -Force
Write-Host "Configuracao migrada com sucesso!"
```

---

## Resumo

**O que migrar:**
1. `opencode.json` (MCP servers, modelos, permissões)
2. `opencode.settings` (onboarding, cor de fundo)
3. `Preferences` (dicionário pt-BR)

**O que NÃO migrar:**
- `service.json` (senha do servidor — será regenerada)
- `opencode.db` (sessões antigas — muito grande)
- Cache e logs

**Resultado:** o OpenCode no notebook vai ter **as mesmas ferramentas (MCP), mesmo idioma (pt-BR) e mesmo visual** do PC atual.
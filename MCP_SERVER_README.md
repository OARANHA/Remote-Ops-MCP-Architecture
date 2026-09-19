# Remote Ops MCP Server

Servidor MCP (Model Context Protocol) para operações remotas seguras em múltiplas VPS Linux.

## Arquitetura

```
ChatGPT
   ↓
Remote Ops MCP (este servidor)
   ↓
Target Registry
   ↓
Capability + Policy Engine
   ↓
Audit
   ↓
SSH (controlled transports)
   ↓
VPS A, VPS B, VPS C, VPS N
```

## Características

- ✅ **21 ferramentas MCP** para operações read-only
- ✅ **Target Registry** com isolamento completo entre targets
- ✅ **Capability Engine** com perfis de permissão
- ✅ **Segurança em 8 camadas** (auth, registry, capability, validation, path, SSH, sanitization, audit)
- ✅ **Proteção contra path traversal** e symlink escape
- ✅ **Redação de secrets** em Docker inspect e logs
- ✅ **Audit trail completo** sem secrets
- ✅ **Protocolo MCP 2026-07-28** com Streamable HTTP transport
- ✅ **28 testes adversariais** documentados

## Instalação

```bash
npm install
```

## Configuração

Edite `config/targets.yaml` para adicionar seus targets:

```yaml
targets:
  wandora-prod:
    id: wandora-prod
    host: 13.140.190.149
    port: 22
    username: ops-mcp
    environment: production
    credentialRef: wandora-prod-ssh
    hostKeyFingerprint: "SHA256:..."
    allowedPaths:
      - /opt/wandora
    allowedServices:
      - wandora-core
      - wandora-web
    capabilityProfile: prod-read-mostly
    disabled: false
```

**IMPORTANTE:** Este arquivo NÃO contém secrets. Credenciais SSH são carregadas de um secure credential store em runtime.

## Executando

```bash
# Desenvolvimento
npm run dev:mcp

# Produção
npm run start:mcp
```

O servidor iniciará em `http://0.0.0.0:3000` com os seguintes endpoints:

- `POST /mcp` - Endpoint MCP principal
- `GET /healthz` - Health check
- `GET /readyz` - Readiness check

## Ferramentas Disponíveis

### Meta (2)
- `health()` - Verifica saúde do servidor
- `ready()` - Verifica se está pronto

### Registry (2)
- `targets_list()` - Lista todos os targets
- `target_status(target)` - Status de um target

### System (5)
- `host_status(target)` - Informações do host
- `disk_usage(target)` - Uso de disco
- `memory_status(target)` - Status de memória
- `uptime(target)` - Uptime do sistema
- `runtime_summary(target)` - Resumo completo

### Docker (4)
- `docker_list(target)` - Lista containers
- `docker_health(target, service)` - Saúde de container
- `docker_inspect_safe(target, service)` - Inspect seguro (secrets redigidos)
- `docker_logs(target, service, lines)` - Logs (redigidos, limitados)

### Services (2)
- `service_status(target, service)` - Status de serviço
- `service_logs(target, service, lines)` - Logs de serviço

### Git (3)
- `git_head(target, repository)` - HEAD atual
- `git_status(target, repository)` - Status do git
- `git_diff_summary(target, repository)` - Resumo do diff

### Filesystem (2)
- `list_directory(target, path)` - Lista diretório
- `read_file(target, path, max_lines)` - Lê arquivo

### Verifiers (1)
- `run_verifier(target, verifier_id)` - Executa verificador registrado

## Segurança

### O que é PROIBIDO

- ❌ Execução de shell arbitrária
- ❌ Login como root
- ❌ Autenticação por senha
- ❌ IPs/credenciais do LLM
- ❌ Conteúdo de secrets em respostas
- ❌ Path traversal
- ❌ Acesso cross-target
- ❌ Admin sem autenticação

### Camadas de Segurança

1. **Autenticação** - OAuth 2.1 / Secure MCP Tunnel
2. **Target Registry** - Apenas targets registrados
3. **Capability Check** - Apenas capabilities registradas
4. **Input Validation** - Schema validation, allowlist
5. **Path Security** - Allowlist + deny rules + realpath
6. **SSH Security** - PubKey only, host key pinned
7. **Output Sanitization** - Secret redaction, bounded output
8. **Audit Trail** - Toda operação logada

## Conectando ao ChatGPT

### Opção A: Remote MCP Server (Público)

```json
{
  "tools": [{
    "type": "mcp",
    "server_label": "remote-ops",
    "server_url": "https://ops.example.com/mcp",
    "authorization": "$OAUTH_TOKEN",
    "require_approval": "always"
  }]
}
```

### Opção B: Secure MCP Tunnel (Privado)

```json
{
  "tools": [{
    "type": "mcp",
    "server_label": "remote-ops",
    "tunnel_id": "tunnel_abc123",
    "require_approval": "always"
  }]
}
```

## Exemplos de Uso

No ChatGPT, você pode perguntar:

- "Qual o status do servidor wandora-prod?"
- "Quais containers estão rodando na wandora?"
- "Mostre os logs do wandora-core"
- "Como está o uso de disco na wandora?"
- "O serviço wandora-web está saudável?"
- "Liste o conteúdo de /opt/wandora"

## Desenvolvimento

### Estrutura do Projeto

```
src/mcp-server/
├── index.ts              # Entry point
├── server.ts             # MCP server setup
├── config/
│   ├── schema.ts         # Zod schemas
│   └── loader.ts         # Config loading
├── targets/
│   └── registry.ts       # Target registry
├── capabilities/
│   └── engine.ts         # Capability engine
├── ssh/
│   └── client.ts         # SSH client
├── security/
│   ├── paths.ts          # Path validation
│   └── secrets.ts        # Secret redaction
├── audit/
│   └── logger.ts         # Audit logging
├── tools/
│   ├── index.ts          # Tool registry
│   ├── health.ts         # Health tools
│   ├── targets.ts        # Target tools
│   ├── system.ts         # System tools
│   ├── docker.ts         # Docker tools
│   ├── services.ts       # Service tools
│   ├── git.ts            # Git tools
│   ├── filesystem.ts     # Filesystem tools
│   └── verifiers.ts      # Verifier tools
└── errors/
    └── index.ts          # Structured errors
```

### Testes

```bash
npm test
```

### Build

```bash
npm run build
```

## Documentação Completa

- [Arquitetura](docs/ARCHITECTURE.md)
- [Modelo de Segurança](docs/SECURITY_MODEL.md)
- [Target Registry](docs/TARGET_REGISTRY.md)
- [Capability Model](docs/CAPABILITY_MODEL.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Conexão ChatGPT](docs/CHATGPT_CONNECTION.md)
- [Target Onboarding](docs/TARGET_ONBOARDING.md)
- [Operações](docs/OPERATIONS.md)
- [Recuperação](docs/RECOVERY.md)
- [Audit](docs/AUDIT.md)

## ADRs

- [ADR-001: Multi-Target Architecture](docs/adr/001-multi-target-architecture.md)
- [ADR-002: Capability-Based Authority](docs/adr/002-capability-based-authority.md)
- [ADR-003: Target Registry](docs/adr/003-target-registry.md)
- [ADR-004: SSH Identity Model](docs/adr/004-ssh-identity-model.md)
- [ADR-005: ChatGPT Connectivity](docs/adr/005-chatgpt-connectivity.md)
- [ADR-006: Secret Handling](docs/adr/006-secret-handling.md)

## Licença

MIT

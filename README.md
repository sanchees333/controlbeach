# 🏐 Resenha Beach — Sistema de Gestão v2.0

Sistema completo para gerenciamento da Arena Resenha Beach.
Roda localmente no Windows via `localhost`.

---

## ⚙️ Requisitos

- [Node.js LTS](https://nodejs.org) instalado

---

## 🚀 Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/resenha-beach.git
cd resenha-beach

# 2. Instale as dependências
npm install
```

> O arquivo `data/resenha.db` (banco de dados) é criado automaticamente na primeira execução.

---

## ▶️ Como usar

### Opção 1 — Atalho na Área de Trabalho (recomendado)
1. Execute `CRIAR_ATALHO.ps1` clicando com botão direito → **Executar com PowerShell**
2. Um atalho "Resenha Beach" será criado na área de trabalho
3. Clique duas vezes para iniciar o sistema

### Opção 2 — Terminal
```bash
npm start
```
Acesse: [http://localhost:3000](http://localhost:3000)

> **Nao feche a janela do terminal** — ela mantem o servidor rodando.

---

## 📋 Funcionalidades

| Modulo | Descricao |
|---|---|
| 🧾 Comandas | Abertura, itens, divisao de conta, multiplas formas de pagamento |
| 💳 Caixa | Abertura/fechamento do dia, saldo, historico |
| 👥 Clientes | Cadastro automatico, historico de visitas e consumo |
| 🏟️ Quadras | Calendario semanal, reservas, treinos fixos, totais por periodo |
| 🏐 Turmas | Alunos, mensalidades, controle de pagamentos |
| 🎉 Eventos | Shows, campeonatos, faturamento manual, lucro liquido |
| 💸 Despesas | Fixas e variaveis, vinculadas a eventos |
| 📊 Dashboard | Receita, lucro, graficos, top produtos, filtro por periodo |
| 🍺 Cardapio | Produtos e precos em tempo real |

---

## 💾 Banco de Dados

- Tecnologia: **SQLite** via `better-sqlite3`
- Arquivo: `data/resenha.db` (gerado automaticamente, ignorado pelo Git)
- **Faca backup regularmente**: copie `data/resenha.db` para um local seguro

---

## 📁 Estrutura do Projeto

```
resenha-beach/
├── src/
│   ├── server.js          ← Servidor Express
│   ├── db/
│   │   └── database.js    ← Configuracao SQLite
│   └── routes/            ← Rotas da API
│       ├── caixa.js
│       ├── clientes.js
│       ├── comandas.js
│       ├── config.js
│       ├── dashboard.js
│       ├── despesas.js
│       ├── eventos.js
│       ├── menu.js
│       ├── quadras.js
│       └── turmas.js
├── public/
│   ├── index.html         ← Interface (SPA)
│   └── img/
│       ├── logo.png
│       └── logo.ico
├── data/                  ← Banco de dados (ignorado pelo Git)
├── INICIAR.bat            ← Inicializador Windows
├── CRIAR_ATALHO.ps1       ← Cria atalho na area de trabalho
├── package.json
└── README.md
```

---

## ❓ Problemas Comuns

**Node.js nao encontrado**
→ Instale em [nodejs.org](https://nodejs.org) e reinicie o computador.

**Nao abre no navegador**
→ Acesse manualmente: [http://localhost:3000](http://localhost:3000)

**Porta 3000 em uso**
→ Feche a janela anterior do sistema e tente novamente.

**Erro ao executar .ps1**
→ Clique direito → Executar com PowerShell. Se pedir permissao, execute no PowerShell como administrador:
```powershell
Set-ExecutionPolicy RemoteSigned
```

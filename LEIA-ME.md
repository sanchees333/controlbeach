# 🏐 Resenha Beach — Sistema de Gestão v2.0

Sistema completo para gerenciamento da Arena Resenha Beach.
Desenvolvido para rodar localmente no Windows (localhost).

---

## 🚀 COMO INSTALAR (faça isso UMA VEZ)

### Passo 1 — Instalar o Node.js
1. Acesse **https://nodejs.org**
2. Clique em **"LTS"** (botão verde, versão recomendada)
3. Baixe e instale normalmente (clique em "Next" em tudo)
4. Reinicie o computador após instalar

### Passo 2 — Adicionar a Logo
- Coloque a imagem da logo dentro da pasta `public/img/`
- O arquivo deve se chamar **`logo.png`**
- A logo aparecerá no canto superior do menu

### Passo 3 — Criar o atalho na Área de Trabalho
1. Clique com botão direito no arquivo **`CRIAR_ATALHO.ps1`**
2. Selecione **"Executar com PowerShell"**
3. Se aparecer uma tela de confirmação, clique em **"Sim"**
4. Um atalho "Resenha Beach" será criado na sua área de trabalho

---

## ▶️ COMO USAR TODO DIA

**Dê um duplo clique no atalho "Resenha Beach" na área de trabalho.**

Isso vai:
1. Iniciar o servidor automaticamente
2. Abrir o sistema no navegador
3. Exibir uma janela preta — **NÃO FECHE ELA** (é o servidor)

Para encerrar o sistema: feche a janela preta.

---

## 📋 FUNCIONALIDADES

### 🧾 Comandas
- Abertura por nome do cliente com ID automático
- Cardápio completo em 1 clique (todas as categorias)
- **Divisão de conta**: igual entre N pessoas OU por itens selecionados
- Múltiplas formas de pagamento por comanda (ex: metade PIX + metade dinheiro)
- Vinculação automática ao evento ativo

### 💳 Caixa
- **Abertura do dia** com valor inicial em dinheiro (troco disponível)
- Saldo atual do caixa em dinheiro (valor inicial + entradas do dia)
- Resumo por forma de pagamento (PIX, Dinheiro, Débito, Crédito)
- Histórico completo de comandas fechadas

### 🏟️ Quadras
- Calendário semanal com as 2 quadras
- Treinos fixos recorrentes (configuráveis)
- Reservas avulsas com valor
- **Painel de totais**: horas de aluguel (hoje/semana/mês) com valor em R$
- **Horas de aulas**: ocupação das turmas por semana/mês
- As turmas aparecem no calendário nos dias/horários corretos

### 🏐 Turmas & Aulas
- **5 turmas padrão**: Futevôlei, Vôlei Masculino, Vôlei Kids, Funcional, Vôlei Feminino
- Criação de novas turmas com horário, quadra e dias
- Alunos individuais por turma com valor próprio ou da turma
- **Controle de mensalidades**: gera cobranças mensais, marca pagamentos
- Receita por turma e total de horas de quadra ocupadas

### 🎉 Eventos
- Criação com tipo (Show, Bingo, Campeonato...)
- **Ativar evento**: novas comandas são vinculadas automaticamente
- **Faturamento Manual**: para dias de show com fichas — lança total por forma de pagamento (PIX, Dinheiro, etc.)
- Despesas vinculadas ao evento
- Lucro líquido por evento = Receita - Despesas
- Tudo entra no Dashboard para análise global

### 💸 Despesas
- Fixas e variáveis por categoria
- Vinculáveis a eventos específicos
- Histórico completo com filtro por período

### 📊 Dashboard
- Receita hoje / mês / histórico
- Lucro líquido com margem %
- Gráfico dos últimos 7 dias
- Gráfico receita vs despesas dos últimos 12 meses
- **Histórico completo**: dados de todos os meses e anos preservados
- Top 10 produtos mais vendidos
- Ranking de eventos por lucro
- Formas de pagamento do mês
- **Filtro por período customizado** (ex: ver Janeiro 2025)

### 🍺 Cardápio
- Cardápio completo da Resenha Beach já cadastrado
- Edição de nomes e preços em tempo real
- Adição de novos produtos por categoria

---

## 💾 BANCO DE DADOS

- Arquivo: `data/resenha.db` (SQLite)
- **Dados preservados indefinidamente** — mesmo após reiniciar
- Comandas abertas permanecem abertas até fechamento manual
- **Faça backup regularmente**: copie o arquivo `data/resenha.db` para um pendrive ou Google Drive

---

## 📁 ESTRUTURA DO PROJETO

```
resenha-beach/
├── INICIAR.bat              ← Clique para iniciar
├── CRIAR_ATALHO.ps1         ← Execute UMA VEZ para criar atalho
├── src/
│   ├── server.js            ← Servidor Node.js
│   ├── db/database.js       ← Banco de dados SQLite
│   └── routes/              ← APIs do sistema
│       ├── comandas.js
│       ├── eventos.js
│       ├── despesas.js
│       ├── quadras.js
│       ├── turmas.js
│       ├── menu.js
│       ├── config.js
│       ├── caixa.js
│       └── dashboard.js
├── public/
│   ├── index.html           ← Interface do sistema
│   └── img/
│       └── logo.png         ← ← COLOQUE A LOGO AQUI
├── data/
│   └── resenha.db           ← Banco de dados (criado automaticamente)
└── package.json
```

---

## ❓ PROBLEMAS COMUNS

**"Node.js não encontrado"**
→ Instale o Node.js em nodejs.org e reinicie o computador.

**"Não abre no navegador"**
→ Abra o Chrome/Edge manualmente e acesse: http://localhost:3000

**"Porta em uso"**
→ Feche a janela preta do sistema anterior e tente novamente.

**"Não consigo executar o .ps1"**
→ Clique direito → Executar com PowerShell → Se pedir confirmação, clique Sim.

---

## 📞 SUPORTE

Em caso de dúvidas sobre o sistema, entre em contato com o desenvolvedor.

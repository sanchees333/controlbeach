const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ── helpers ──────────────────────────────────────────────────────────────────
function receitaPeriodo(inicio, fim) {
  const cmd = db.prepare(`
    SELECT COALESCE(SUM(cp.valor),0) as t FROM comanda_pagamentos cp
    JOIN comandas c ON cp.comanda_id = c.id
    WHERE date(c.fechada_em) BETWEEN ? AND ?`).get(inicio, fim).t;
  const ev = db.prepare(`
    SELECT COALESCE(SUM(valor),0) as t FROM evento_faturamentos
    WHERE data BETWEEN ? AND ?`).get(inicio, fim).t;
  return cmd + ev;
}

function despesasPeriodo(inicio, fim) {
  return db.prepare(`SELECT COALESCE(SUM(valor),0) as t FROM despesas WHERE data BETWEEN ? AND ?`).get(inicio, fim).t;
}

function comandasPeriodo(inicio, fim) {
  return db.prepare(`SELECT COUNT(*) as n FROM comandas WHERE fechada=1 AND date(fechada_em) BETWEEN ? AND ?`).get(inicio, fim).n;
}

function ticketMedioPeriodo(inicio, fim) {
  return db.prepare(`SELECT COALESCE(AVG(total),0) as t FROM comandas WHERE fechada=1 AND date(fechada_em) BETWEEN ? AND ?`).get(inicio, fim).t;
}

function topProdutosPeriodo(inicio, fim, limit = 10) {
  return db.prepare(`
    SELECT ci.nome, SUM(ci.qty) as total_qty, SUM(ci.preco*ci.qty) as total_val
    FROM comanda_items ci JOIN comandas c ON ci.comanda_id=c.id
    WHERE c.fechada=1 AND date(c.fechada_em) BETWEEN ? AND ?
    GROUP BY ci.prod_id, ci.nome ORDER BY total_val DESC LIMIT ?`).all(inicio, fim, limit);
}

function pagamentosPeriodo(inicio, fim) {
  return db.prepare(`
    SELECT cp.forma_pagamento, COUNT(*) as qtd, SUM(cp.valor) as total
    FROM comanda_pagamentos cp JOIN comandas c ON cp.comanda_id=c.id
    WHERE date(c.fechada_em) BETWEEN ? AND ?
    GROUP BY cp.forma_pagamento ORDER BY total DESC`).all(inicio, fim);
}

function despCategPeriodo(inicio, fim) {
  return db.prepare(`
    SELECT categoria, SUM(valor) as total FROM despesas
    WHERE data BETWEEN ? AND ? GROUP BY categoria ORDER BY total DESC`).all(inicio, fim);
}

function eventosPeriodo(inicio, fim) {
  const evs = db.prepare(`SELECT * FROM eventos WHERE data BETWEEN ? AND ? ORDER BY data DESC`).all(inicio, fim);
  return evs.map(ev => {
    const desp = db.prepare('SELECT COALESCE(SUM(valor),0) as t FROM despesas WHERE evento_id=?').get(ev.id).t;
    const fat  = db.prepare('SELECT COALESCE(SUM(valor),0) as t FROM evento_faturamentos WHERE evento_id=?').get(ev.id).t;
    const rec  = (ev.receita || 0);
    return { id: ev.id, nome: ev.nome, data: ev.data, tipo: ev.tipo, receita: rec + fat, despesas: desp + (ev.custo_proprio || 0), lucro: (rec + fat) - desp - (ev.custo_proprio || 0) };
  }).sort((a, b) => b.lucro - a.lucro);
}

// ── GET / — dados do mês e do dia atual (topbar) ─────────────────────────────
router.get('/', (req, res) => {
  const hoje     = new Date().toISOString().split('T')[0];
  const now      = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mesIni   = `${mesAtual}-01`;
  const mesUltDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mesFim   = `${mesAtual}-${mesUltDia}`;

  const receitaHoje = receitaPeriodo(hoje, hoje);
  const receitaMes  = receitaPeriodo(mesIni, mesFim);
  const despMes     = despesasPeriodo(mesIni, mesFim);
  const cmdHoje     = comandasPeriodo(hoje, hoje);
  const cmdMes      = comandasPeriodo(mesIni, mesFim);
  const ticketMedio = ticketMedioPeriodo('2000-01-01', '2099-12-31');
  const recTotal    = receitaPeriodo('2000-01-01', '2099-12-31');
  const despTotal   = despesasPeriodo('2000-01-01', '2099-12-31');
  const cmdTotal    = comandasPeriodo('2000-01-01', '2099-12-31');

  // últimos 12 meses para o gráfico da topbar
  const meses12 = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const ms  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ini = `${ms}-01`;
    const fim = `${ms}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`;
    const rec  = receitaPeriodo(ini, fim);
    const desp = despesasPeriodo(ini, fim);
    meses12.push({ mes: ms, label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), receita: rec, despesas: desp, lucro: rec - desp });
  }

  res.json({
    receitaHoje, cmdHoje,
    receitaMes, cmdMes, despMes, lucroMes: receitaMes - despMes,
    ticketMedio,
    receitaTotal: recTotal, despTotal, cmdTotal, lucroTotal: recTotal - despTotal,
    meses12
  });
});

// ── GET /periodo — dados detalhados de um período qualquer ────────────────────
router.get('/periodo', (req, res) => {
  const { inicio, fim, ano } = req.query;
  if (!inicio || !fim) return res.status(400).json({ error: 'inicio e fim obrigatórios' });

  const rec   = receitaPeriodo(inicio, fim);
  const desp  = despesasPeriodo(inicio, fim);
  const cmds  = comandasPeriodo(inicio, fim);
  const ticket = ticketMedioPeriodo(inicio, fim);

  // Dias individuais dentro do período (para gráfico)
  const dias = [];
  const di = new Date(inicio + 'T12:00:00');
  const df = new Date(fim + 'T12:00:00');
  const diffDays = Math.round((df - di) / 86400000) + 1;

  // Só gera por dia se o período for <= 62 dias (evita sobrecarga)
  if (diffDays <= 62) {
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(di); d.setDate(di.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const r  = receitaPeriodo(ds, ds);
      dias.push({ data: ds, label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), receita: r });
    }
  }

  // Se for consulta anual, gera breakdown mensal
  let meses = [];
  if (ano) {
    for (let m = 1; m <= 12; m++) {
      const ms    = `${ano}-${String(m).padStart(2, '0')}`;
      const ini   = `${ms}-01`;
      const lastD = new Date(+ano, m, 0).getDate();
      const fim2  = `${ms}-${lastD}`;
      const r     = receitaPeriodo(ini, fim2);
      const d2    = despesasPeriodo(ini, fim2);
      const c     = comandasPeriodo(ini, fim2);
      const mesNome = new Date(+ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
      const mesCompleto = new Date(+ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      meses.push({ mes: ms, label: mesNome, nomeCompleto: mesCompleto.charAt(0).toUpperCase() + mesCompleto.slice(1), receita: r, despesas: d2, lucro: r - d2, comandas: c });
    }
  }

  res.json({
    inicio, fim,
    receita: rec,
    despesas: desp,
    lucro: rec - desp,
    comandas: cmds,
    ticketMedio: ticket,
    dias,
    meses,
    topProdutos:   topProdutosPeriodo(inicio, fim),
    pagamentos:    pagamentosPeriodo(inicio, fim),
    despCategorias: despCategPeriodo(inicio, fim),
    eventos:       eventosPeriodo(inicio, fim)
  });
});

module.exports = router;

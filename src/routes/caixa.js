const express = require('express');
const router = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

// GET status do dia
router.get('/status', (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  const abertura = db.prepare('SELECT * FROM caixa_abertura WHERE data = ?').get(hoje);
  const fechamento = db.prepare('SELECT * FROM caixa_fechamento WHERE data = ?').get(hoje);
  const abertas = db.prepare("SELECT COUNT(*) as n FROM comandas WHERE fechada = 0").get().n;
  res.json({ hoje, aberto: !!abertura && !fechamento, abertura: abertura || null, fechamento: fechamento || null, abertas });
});

// GET resumo do dia
router.get('/resumo/:data', (req, res) => {
  const data = req.params.data;
  const abertura = db.prepare('SELECT * FROM caixa_abertura WHERE data = ?').get(data);
  const fechamento = db.prepare('SELECT * FROM caixa_fechamento WHERE data = ?').get(data);

  const pagamentos = db.prepare(`
    SELECT cp.forma_pagamento, COALESCE(SUM(cp.valor),0) as total, COUNT(DISTINCT cp.comanda_id) as qtd
    FROM comanda_pagamentos cp
    JOIN comandas c ON cp.comanda_id = c.id
    WHERE date(c.fechada_em) = ? GROUP BY cp.forma_pagamento
  `).all(data);

  const fatEventos = db.prepare(`
    SELECT ef.forma_pagamento, COALESCE(SUM(ef.valor),0) as total
    FROM evento_faturamentos ef WHERE ef.data = ? GROUP BY ef.forma_pagamento
  `).all(data);

  const totalCmds = pagamentos.reduce((a, p) => a + p.total, 0);
  const totalEventos = fatEventos.reduce((a, p) => a + p.total, 0);
  const totalGeral = totalCmds + totalEventos;
  const dinheiroDia = [...pagamentos, ...fatEventos].filter(p => p.forma_pagamento === 'dinheiro').reduce((a, p) => a + p.total, 0);
  const saldoCaixa = (abertura?.valor_inicial || 0) + dinheiroDia;
  const abertas = db.prepare("SELECT COUNT(*) as n FROM comandas WHERE fechada = 0").get().n;
  const cmdsAbertas = db.prepare("SELECT id, numero, nome, total FROM comandas WHERE fechada = 0 ORDER BY criada_em").all();

  res.json({ data, abertura, fechamento, pagamentos, fatEventos, totalCmds, totalEventos, totalGeral, saldoCaixa, dinheiroDia, abertas, cmdsAbertas });
});

// POST abrir caixa
router.post('/abertura', (req, res) => {
  const { data, valor_inicial, obs } = req.body;
  const hoje = data || new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM caixa_abertura WHERE data = ?').get(hoje);
  if (existing) {
    db.prepare('UPDATE caixa_abertura SET valor_inicial=?, obs=? WHERE data=?').run(valor_inicial || 0, obs || '', hoje);
  } else {
    db.prepare('INSERT INTO caixa_abertura (id,data,valor_inicial,obs) VALUES (?,?,?,?)').run(uid(), hoje, valor_inicial || 0, obs || '');
  }
  res.json(db.prepare('SELECT * FROM caixa_abertura WHERE data = ?').get(hoje));
});

// POST fechar caixa — bloqueia se tiver comanda aberta
router.post('/fechar', (req, res) => {
  const { obs, forcar } = req.body;
  const hoje = new Date().toISOString().split('T')[0];

  const abertas = db.prepare("SELECT id, numero, nome, total FROM comandas WHERE fechada = 0 ORDER BY criada_em").all();
  if (abertas.length > 0 && !forcar) {
    return res.status(400).json({ error: 'comandas_abertas', abertas });
  }

  // Consolida totais
  const pagamentos = db.prepare(`
    SELECT cp.forma_pagamento, COALESCE(SUM(cp.valor),0) as total
    FROM comanda_pagamentos cp JOIN comandas c ON cp.comanda_id = c.id
    WHERE date(c.fechada_em) = ? GROUP BY cp.forma_pagamento
  `).all(hoje);
  const fatEventos = db.prepare(`
    SELECT ef.forma_pagamento, COALESCE(SUM(ef.valor),0) as total
    FROM evento_faturamentos ef WHERE ef.data = ? GROUP BY ef.forma_pagamento
  `).all(hoje);

  const all = [...pagamentos, ...fatEventos];
  const get = f => all.filter(p => p.forma_pagamento === f).reduce((a, p) => a + p.total, 0);
  const abertura = db.prepare('SELECT * FROM caixa_abertura WHERE data = ?').get(hoje);
  const totalCmds = pagamentos.reduce((a, p) => a + p.total, 0);
  const totalEventos = fatEventos.reduce((a, p) => a + p.total, 0);

  const id = uid();
  db.prepare(`INSERT OR REPLACE INTO caixa_fechamento
    (id,data,valor_inicial,total_comandas,total_eventos,total_geral,dinheiro_total,pix_total,debito_total,credito_total,obs)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, hoje, abertura?.valor_inicial || 0,
    totalCmds, totalEventos, totalCmds + totalEventos,
    get('dinheiro'), get('pix'), get('debito'), get('credito'), obs || ''
  );

  res.json({ ok: true, fechamento: db.prepare('SELECT * FROM caixa_fechamento WHERE id = ?').get(id) });
});

// GET histórico de fechamentos
router.get('/historico', (req, res) => {
  res.json(db.prepare(`
    SELECT cf.*, ca.valor_inicial as vi, ca.obs as obs_abertura
    FROM caixa_fechamento cf LEFT JOIN caixa_abertura ca ON cf.data = ca.data
    ORDER BY cf.data DESC LIMIT 60
  `).all());
});

module.exports = router;

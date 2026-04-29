const express = require('express');
const router = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

function enrich(c) {
  c.fechada = !!c.fechada;
  c.items = db.prepare('SELECT * FROM comanda_items WHERE comanda_id = ?').all(c.id);
  c.pagamentos = db.prepare('SELECT * FROM comanda_pagamentos WHERE comanda_id = ?').all(c.id);
  return c;
}

// GET all
router.get('/', (req, res) => {
  const { fechada } = req.query;
  let q = `SELECT c.*, e.nome as evento_nome FROM comandas c LEFT JOIN eventos e ON c.evento_id = e.id`;
  const params = [];
  if (fechada !== undefined) { q += ' WHERE c.fechada = ?'; params.push(fechada === 'true' ? 1 : 0); }
  q += ' ORDER BY c.criada_em DESC';
  res.json(db.prepare(q).all(...params).map(enrich));
});

// GET single
router.get('/:id', (req, res) => {
  const c = db.prepare('SELECT c.*, e.nome as evento_nome FROM comandas c LEFT JOIN eventos e ON c.evento_id = e.id WHERE c.id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Não encontrada' });
  res.json(enrich(c));
});

// POST create — numeração sequencial por dia
router.post('/', (req, res) => {
  const { nome, cliente_id } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });

  const hoje = new Date().toISOString().split('T')[0];

  // Verifica se o caixa está aberto
  const caixaAberto = db.prepare('SELECT * FROM caixa_abertura WHERE data = ?').get(hoje);
  if (!caixaAberto) return res.status(400).json({ error: 'Abra o caixa antes de criar comandas!' });

  // Número sequencial do dia (001, 002...)
  const seqRow = db.prepare('SELECT * FROM seq_dia WHERE data = ?').get(hoje);
  let numero;
  if (seqRow) {
    numero = seqRow.ultimo_numero + 1;
    db.prepare('UPDATE seq_dia SET ultimo_numero = ? WHERE data = ?').run(numero, hoje);
  } else {
    numero = 1;
    db.prepare('INSERT INTO seq_dia (data, ultimo_numero) VALUES (?, 1)').run(hoje);
  }

  // Upsert cliente — salva para sempre
  let cliId = cliente_id || null;
  if (!cliId) {
    const existing = db.prepare('SELECT id FROM clientes WHERE LOWER(nome) = LOWER(?)').get(nome.trim());
    if (existing) {
      cliId = existing.id;
    } else {
      cliId = uid();
      db.prepare('INSERT INTO clientes (id, nome) VALUES (?, ?)').run(cliId, nome.trim());
    }
  }

  const activeEvent = db.prepare("SELECT valor FROM config WHERE chave = 'active_event_id'").get()?.valor || null;
  const id = uid();
  db.prepare('INSERT INTO comandas (id, numero, nome, cliente_id, evento_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, numero, nome.trim(), cliId, activeEvent || null);

  const c = db.prepare('SELECT * FROM comandas WHERE id = ?').get(id);
  c.fechada = false; c.items = []; c.pagamentos = [];
  res.json(c);
});

// PATCH rename
router.patch('/:id', (req, res) => {
  const { nome } = req.body;
  if (nome) db.prepare('UPDATE comandas SET nome = ? WHERE id = ?').run(nome.trim(), req.params.id);
  res.json({ ok: true });
});

// POST add item
router.post('/:id/items', (req, res) => {
  const { prod_id } = req.body;
  const cmd = db.prepare('SELECT * FROM comandas WHERE id = ?').get(req.params.id);
  if (!cmd || cmd.fechada) return res.status(400).json({ error: 'Comanda inválida' });
  const prod = db.prepare('SELECT * FROM menu_produtos WHERE id = ?').get(prod_id);
  if (!prod) return res.status(404).json({ error: 'Produto não encontrado' });
  const existing = db.prepare('SELECT * FROM comanda_items WHERE comanda_id = ? AND prod_id = ?').get(cmd.id, prod_id);
  if (existing) {
    db.prepare('UPDATE comanda_items SET qty = qty + 1 WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO comanda_items (id,comanda_id,prod_id,nome,preco,qty) VALUES (?,?,?,?,?,1)')
      .run(uid(), cmd.id, prod_id, prod.nome, prod.preco);
  }
  const total = db.prepare('SELECT COALESCE(SUM(preco*qty),0) as t FROM comanda_items WHERE comanda_id = ?').get(cmd.id).t;
  db.prepare('UPDATE comandas SET total = ? WHERE id = ?').run(total, cmd.id);
  res.json({ total, items: db.prepare('SELECT * FROM comanda_items WHERE comanda_id = ?').all(cmd.id) });
});

// PATCH item qty
router.patch('/:id/items/:itemId', (req, res) => {
  const { qty } = req.body;
  if (qty <= 0) db.prepare('DELETE FROM comanda_items WHERE id = ?').run(req.params.itemId);
  else db.prepare('UPDATE comanda_items SET qty = ? WHERE id = ?').run(qty, req.params.itemId);
  const total = db.prepare('SELECT COALESCE(SUM(preco*qty),0) as t FROM comanda_items WHERE comanda_id = ?').get(req.params.id).t;
  db.prepare('UPDATE comandas SET total = ? WHERE id = ?').run(total, req.params.id);
  res.json({ total, items: db.prepare('SELECT * FROM comanda_items WHERE comanda_id = ?').all(req.params.id) });
});

// POST fechar comanda
router.post('/:id/fechar', (req, res) => {
  const { pagamentos, obs } = req.body;
  if (!pagamentos?.length) return res.status(400).json({ error: 'Informe ao menos um pagamento' });
  const cmd = db.prepare('SELECT * FROM comandas WHERE id = ?').get(req.params.id);
  if (!cmd) return res.status(404).json({ error: 'Não encontrada' });
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare('UPDATE comandas SET fechada=1, obs=?, fechada_em=? WHERE id=?').run(obs || '', now, cmd.id);
  const ins = db.prepare('INSERT INTO comanda_pagamentos (id,comanda_id,forma_pagamento,valor) VALUES (?,?,?,?)');
  pagamentos.forEach(p => ins.run(uid(), cmd.id, p.forma_pagamento, p.valor));
  if (cmd.evento_id) {
    db.prepare('UPDATE eventos SET receita = receita + ? WHERE id = ?').run(cmd.total, cmd.evento_id);
  }
  // Atualiza perfil do cliente
  if (cmd.cliente_id) {
    db.prepare(`UPDATE clientes SET
      total_gasto = total_gasto + ?,
      total_visitas = total_visitas + 1,
      ultima_visita = ?
      WHERE id = ?`).run(cmd.total, now, cmd.cliente_id);
  }
  res.json({ ok: true, total: cmd.total });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM comandas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

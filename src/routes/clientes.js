const express = require('express');
const router = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

// GET all — busca por nome (autocomplete)
router.get('/', (req, res) => {
  const { q, limit } = req.query;
  let query = 'SELECT * FROM clientes';
  const params = [];
  if (q) { query += ' WHERE LOWER(nome) LIKE LOWER(?)'; params.push(`%${q}%`); }
  query += ' ORDER BY total_visitas DESC, nome ASC';
  if (limit) query += ` LIMIT ${parseInt(limit)}`;
  res.json(db.prepare(query).all(...params));
});

// GET single com histórico completo
router.get('/:id', (req, res) => {
  const cli = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cli) return res.status(404).json({ error: 'Não encontrado' });

  // Últimas 20 comandas
  const comandas = db.prepare(`
    SELECT c.*, e.nome as evento_nome FROM comandas c
    LEFT JOIN eventos e ON c.evento_id = e.id
    WHERE c.cliente_id = ? ORDER BY c.criada_em DESC LIMIT 20
  `).all(req.params.id);
  comandas.forEach(c => {
    c.fechada = !!c.fechada;
    c.items = db.prepare('SELECT * FROM comanda_items WHERE comanda_id = ?').all(c.id);
    c.pagamentos = db.prepare('SELECT * FROM comanda_pagamentos WHERE comanda_id = ?').all(c.id);
  });

  // Produtos mais consumidos
  const topProdutos = db.prepare(`
    SELECT ci.nome, SUM(ci.qty) as total_qty, SUM(ci.preco * ci.qty) as total_val
    FROM comanda_items ci
    JOIN comandas c ON ci.comanda_id = c.id
    WHERE c.cliente_id = ? AND c.fechada = 1
    GROUP BY ci.prod_id ORDER BY total_qty DESC LIMIT 5
  `).all(req.params.id);

  res.json({ ...cli, comandas, topProdutos });
});

// POST create manual
router.post('/', (req, res) => {
  const { nome, telefone, obs } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  const existing = db.prepare('SELECT * FROM clientes WHERE LOWER(nome) = LOWER(?)').get(nome.trim());
  if (existing) return res.json(existing);
  const id = uid();
  db.prepare('INSERT INTO clientes (id, nome, telefone, obs) VALUES (?, ?, ?, ?)').run(id, nome.trim(), telefone || '', obs || '');
  res.json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(id));
});

// PATCH update
router.patch('/:id', (req, res) => {
  const { nome, telefone, obs } = req.body;
  const cli = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cli) return res.status(404).json({ error: 'Não encontrado' });
  db.prepare('UPDATE clientes SET nome=?, telefone=?, obs=? WHERE id=?')
    .run(nome || cli.nome, telefone !== undefined ? telefone : cli.telefone, obs !== undefined ? obs : cli.obs, req.params.id);
  res.json({ ok: true });
});

module.exports = router;

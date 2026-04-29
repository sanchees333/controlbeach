// ── menu.js ──────────────────────────────────────────────────────────────────
const express = require('express');
const menuRouter = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

menuRouter.get('/', (req, res) => {
  const cats = db.prepare('SELECT * FROM menu_categorias ORDER BY ordem').all();
  cats.forEach(c => { c.products = db.prepare('SELECT * FROM menu_produtos WHERE categoria_id=? AND ativo=1').all(c.id); });
  res.json(cats);
});
menuRouter.post('/produtos', (req, res) => {
  const { categoria_id, nome, preco } = req.body;
  const id = uid();
  db.prepare('INSERT INTO menu_produtos (id,categoria_id,nome,preco) VALUES (?,?,?,?)').run(id,categoria_id,nome,preco);
  res.json(db.prepare('SELECT * FROM menu_produtos WHERE id = ?').get(id));
});
menuRouter.put('/produtos/:id', (req, res) => {
  db.prepare('UPDATE menu_produtos SET nome=?,preco=? WHERE id=?').run(req.body.nome, req.body.preco, req.params.id);
  res.json({ ok: true });
});
menuRouter.delete('/produtos/:id', (req, res) => { db.prepare('DELETE FROM menu_produtos WHERE id = ?').run(req.params.id); res.json({ ok: true }); });

module.exports = menuRouter;

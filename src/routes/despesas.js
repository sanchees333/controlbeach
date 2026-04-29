// despesas.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT d.*, e.nome as evento_nome FROM despesas d LEFT JOIN eventos e ON d.evento_id = e.id ORDER BY d.data DESC, d.criado_em DESC').all());
});
router.post('/', (req, res) => {
  const { descricao, categoria, tipo, valor, data, evento_id } = req.body;
  const id = uid();
  db.prepare('INSERT INTO despesas (id,descricao,categoria,tipo,valor,data,evento_id) VALUES (?,?,?,?,?,?,?)').run(id,descricao,categoria,tipo||'variavel',valor||0,data,evento_id||null);
  res.json(db.prepare('SELECT * FROM despesas WHERE id = ?').get(id));
});
router.delete('/:id', (req, res) => { db.prepare('DELETE FROM despesas WHERE id = ?').run(req.params.id); res.json({ ok: true }); });
module.exports = router;

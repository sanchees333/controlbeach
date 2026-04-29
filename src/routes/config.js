const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM config').all();
  const cfg = {};
  rows.forEach(r => cfg[r.chave] = r.valor);
  res.json(cfg);
});
router.post('/', (req, res) => {
  const s = db.prepare("INSERT INTO config (chave,valor) VALUES (?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor");
  for (const [k,v] of Object.entries(req.body)) s.run(k, String(v));
  if (req.body.aluguel_quadra_1h) db.prepare("UPDATE menu_produtos SET preco=? WHERE id='p130'").run(+req.body.aluguel_quadra_1h);
  if (req.body.aluguel_quadra_30) db.prepare("UPDATE menu_produtos SET preco=? WHERE id='p131'").run(+req.body.aluguel_quadra_30);
  res.json({ ok: true });
});
module.exports = router;

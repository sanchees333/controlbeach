const express = require('express');
const router = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

router.get('/', (req, res) => {
  const evs = db.prepare('SELECT * FROM eventos ORDER BY data DESC').all();
  evs.forEach(ev => {
    ev.ativo = !!ev.ativo;
    ev.despesas = db.prepare('SELECT * FROM despesas WHERE evento_id = ?').all(ev.id);
    ev.faturamentos = db.prepare('SELECT * FROM evento_faturamentos WHERE evento_id = ? ORDER BY criado_em DESC').all(ev.id);
    ev.total_faturamentos = ev.faturamentos.reduce((a,f)=>a+f.valor,0);
    ev.total_despesas = ev.despesas.reduce((a,d)=>a+d.valor,0) + (ev.custo_proprio||0);
    ev.receita_total = (ev.receita||0) + ev.total_faturamentos;
    ev.lucro = ev.receita_total - ev.total_despesas;
    ev.num_comandas = db.prepare('SELECT COUNT(*) as n FROM comandas WHERE evento_id = ?').get(ev.id).n;
  });
  res.json(evs);
});

router.get('/:id', (req, res) => {
  const ev = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Não encontrado' });
  ev.ativo = !!ev.ativo;
  ev.despesas = db.prepare('SELECT * FROM despesas WHERE evento_id = ? ORDER BY criado_em DESC').all(ev.id);
  ev.faturamentos = db.prepare('SELECT * FROM evento_faturamentos WHERE evento_id = ? ORDER BY criado_em DESC').all(ev.id);
  ev.total_faturamentos = ev.faturamentos.reduce((a,f)=>a+f.valor,0);
  ev.total_despesas = ev.despesas.reduce((a,d)=>a+d.valor,0) + (ev.custo_proprio||0);
  ev.receita_total = (ev.receita||0) + ev.total_faturamentos;
  ev.lucro = ev.receita_total - ev.total_despesas;
  ev.comandas = db.prepare('SELECT * FROM comandas WHERE evento_id = ? ORDER BY criada_em DESC').all(ev.id);
  ev.comandas.forEach(c => {
    c.fechada = !!c.fechada;
    c.items = db.prepare('SELECT * FROM comanda_items WHERE comanda_id = ?').all(c.id);
    c.pagamentos = db.prepare('SELECT * FROM comanda_pagamentos WHERE comanda_id = ?').all(c.id);
  });
  res.json(ev);
});

router.post('/', (req, res) => {
  const { nome, data, tipo, ingresso, custo_proprio, descricao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  const id = uid();
  db.prepare('INSERT INTO eventos (id,nome,data,tipo,ingresso,custo_proprio,descricao) VALUES (?,?,?,?,?,?,?)').run(id,nome,data,tipo||'Evento',ingresso||0,custo_proprio||0,descricao||'');
  res.json(db.prepare('SELECT * FROM eventos WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { nome, data, tipo, ingresso, custo_proprio, descricao } = req.body;
  db.prepare('UPDATE eventos SET nome=?,data=?,tipo=?,ingresso=?,custo_proprio=?,descricao=? WHERE id=?').run(nome,data,tipo,ingresso||0,custo_proprio||0,descricao||'',req.params.id);
  res.json({ ok: true });
});

router.post('/:id/ativar', (req, res) => {
  db.prepare('UPDATE eventos SET ativo=0').run();
  db.prepare('UPDATE eventos SET ativo=1 WHERE id=?').run(req.params.id);
  db.prepare("UPDATE config SET valor=? WHERE chave='active_event_id'").run(req.params.id);
  res.json({ ok: true });
});

router.post('/desativar', (req, res) => {
  db.prepare('UPDATE eventos SET ativo=0').run();
  db.prepare("UPDATE config SET valor='' WHERE chave='active_event_id'").run();
  res.json({ ok: true });
});

// Faturamento manual (fichas / show)
router.post('/:id/faturamento', (req, res) => {
  const { descricao, forma_pagamento, valor, data } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Valor inválido' });
  const id = uid();
  const dt = data || new Date().toISOString().split('T')[0];
  db.prepare('INSERT INTO evento_faturamentos (id,evento_id,descricao,forma_pagamento,valor,data) VALUES (?,?,?,?,?,?)').run(id, req.params.id, descricao||'Faturamento', forma_pagamento||'pix', valor, dt);
  // também soma na receita do evento
  db.prepare('UPDATE eventos SET receita = receita + ? WHERE id = ?').run(valor, req.params.id);
  res.json(db.prepare('SELECT * FROM evento_faturamentos WHERE id = ?').get(id));
});

router.delete('/:id/faturamento/:fid', (req, res) => {
  const fat = db.prepare('SELECT * FROM evento_faturamentos WHERE id = ?').get(req.params.fid);
  if (fat) db.prepare('UPDATE eventos SET receita = receita - ? WHERE id = ?').run(fat.valor, req.params.id);
  db.prepare('DELETE FROM evento_faturamentos WHERE id = ?').run(req.params.fid);
  res.json({ ok: true });
});

router.post('/:id/ingresso', (req, res) => {
  const { qty, valor } = req.body;
  const total = qty * valor;
  db.prepare('UPDATE eventos SET receita_ingresso=receita_ingresso+?, receita=receita+? WHERE id=?').run(total,total,req.params.id);
  res.json({ ok: true, total });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM eventos WHERE id = ?').run(req.params.id);
  const active = db.prepare("SELECT valor FROM config WHERE chave='active_event_id'").get()?.valor;
  if (active === req.params.id) db.prepare("UPDATE config SET valor='' WHERE chave='active_event_id'").run();
  res.json({ ok: true });
});

module.exports = router;

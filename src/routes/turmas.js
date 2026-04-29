const express = require('express');
const router = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

// GET all turmas with stats
router.get('/', (req, res) => {
  const turmas = db.prepare('SELECT * FROM turmas ORDER BY nome').all();
  turmas.forEach(t => {
    t.ativo = !!t.ativo;
    t.alunos = db.prepare('SELECT * FROM alunos WHERE turma_id = ? ORDER BY nome').all(t.id).map(a => ({...a, ativo:!!a.ativo, usa_valor_turma:!!a.usa_valor_turma}));
    t.total_alunos = t.alunos.filter(a=>a.ativo).length;
    t.receita_mensal = t.alunos.filter(a=>a.ativo).reduce((s,a) => s + (a.usa_valor_turma ? t.valor_mensal : a.valor_individual), 0);
    // horas por semana
    const diasCount = (t.dias_semana||'').split(',').filter(Boolean).length || 0;
    t.horas_semana = (t.duracao_horas||1) * diasCount;
    t.horas_mes = Math.round(t.horas_semana * 4.33 * 10) / 10;
  });
  res.json(turmas);
});

router.get('/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Não encontrada' });
  t.ativo = !!t.ativo;
  t.alunos = db.prepare('SELECT * FROM alunos WHERE turma_id = ? ORDER BY nome').all(t.id).map(a => ({...a,ativo:!!a.ativo,usa_valor_turma:!!a.usa_valor_turma}));
  t.total_alunos = t.alunos.filter(a=>a.ativo).length;
  t.receita_mensal = t.alunos.filter(a=>a.ativo).reduce((s,a)=>s+(a.usa_valor_turma?t.valor_mensal:a.valor_individual),0);
  const diasCount = (t.dias_semana||'').split(',').filter(Boolean).length||0;
  t.horas_semana = (t.duracao_horas||1)*diasCount;
  t.horas_mes = Math.round(t.horas_semana*4.33*10)/10;
  // pagamentos do mês atual
  const mes = new Date().toISOString().slice(0,7);
  t.pagamentos_mes = db.prepare('SELECT pa.*, a.nome as aluno_nome FROM pagamentos_aulas pa LEFT JOIN alunos a ON pa.aluno_id=a.id WHERE pa.turma_id=? AND pa.mes_referencia=? ORDER BY a.nome').all(t.id, mes).map(p=>({...p,pago:!!p.pago}));
  res.json(t);
});

// CRUD turmas
router.post('/', (req, res) => {
  const { nome, modalidade, quadra, dias_semana, hora_inicio, hora_fim, duracao_horas, valor_mensal, obs } = req.body;
  const id = uid();
  db.prepare('INSERT INTO turmas (id,nome,modalidade,quadra,dias_semana,hora_inicio,hora_fim,duracao_horas,valor_mensal,obs) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,nome,modalidade||'Futevôlei',quadra||1,dias_semana||'',hora_inicio||'',hora_fim||'',duracao_horas||1,valor_mensal||0,obs||'');
  res.json(db.prepare('SELECT * FROM turmas WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { nome, modalidade, quadra, dias_semana, hora_inicio, hora_fim, duracao_horas, valor_mensal, ativo, obs } = req.body;
  db.prepare('UPDATE turmas SET nome=?,modalidade=?,quadra=?,dias_semana=?,hora_inicio=?,hora_fim=?,duracao_horas=?,valor_mensal=?,ativo=?,obs=? WHERE id=?').run(nome,modalidade,quadra,dias_semana,hora_inicio,hora_fim,duracao_horas,valor_mensal,ativo?1:0,obs||'',req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => { db.prepare('DELETE FROM turmas WHERE id = ?').run(req.params.id); res.json({ ok: true }); });

// Alunos
router.post('/:id/alunos', (req, res) => {
  const { nome, valor_individual, usa_valor_turma, telefone, obs } = req.body;
  const id = uid();
  db.prepare('INSERT INTO alunos (id,nome,turma_id,valor_individual,usa_valor_turma,telefone,obs) VALUES (?,?,?,?,?,?,?)').run(id,nome,req.params.id,valor_individual||0,usa_valor_turma!==false?1:0,telefone||'',obs||'');
  res.json({...db.prepare('SELECT * FROM alunos WHERE id = ?').get(id), ativo:true, usa_valor_turma:true});
});

router.patch('/alunos/:aid', (req, res) => {
  const a = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.aid);
  if (!a) return res.status(404).json({ error: 'Não encontrado' });
  const { nome, valor_individual, usa_valor_turma, telefone, ativo, obs } = req.body;
  db.prepare('UPDATE alunos SET nome=?,valor_individual=?,usa_valor_turma=?,telefone=?,ativo=?,obs=? WHERE id=?').run(nome||a.nome,valor_individual!==undefined?valor_individual:a.valor_individual,usa_valor_turma!==undefined?(usa_valor_turma?1:0):a.usa_valor_turma,telefone||a.telefone,ativo!==undefined?(ativo?1:0):a.ativo,obs||a.obs,req.params.aid);
  res.json({ ok: true });
});

router.delete('/alunos/:aid', (req, res) => { db.prepare('DELETE FROM alunos WHERE id = ?').run(req.params.aid); res.json({ ok: true }); });

// Pagamentos mensais
router.get('/:id/pagamentos/:mes', (req, res) => {
  const pags = db.prepare('SELECT pa.*, a.nome as aluno_nome FROM pagamentos_aulas pa LEFT JOIN alunos a ON pa.aluno_id=a.id WHERE pa.turma_id=? AND pa.mes_referencia=? ORDER BY a.nome').all(req.params.id, req.params.mes);
  res.json(pags.map(p=>({...p,pago:!!p.pago})));
});

// Gerar cobranças do mês para uma turma
router.post('/:id/gerar-cobrancas/:mes', (req, res) => {
  const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
  const alunos = db.prepare('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1').all(req.params.id);
  const ins = db.prepare('INSERT OR IGNORE INTO pagamentos_aulas (id,aluno_id,turma_id,mes_referencia,valor,pago) VALUES (?,?,?,?,?,0)');
  alunos.forEach(a => {
    const val = a.usa_valor_turma ? turma.valor_mensal : a.valor_individual;
    ins.run(uid(), a.id, turma.id, req.params.mes, val);
  });
  res.json({ ok: true, gerados: alunos.length });
});

// Marcar pagamento
router.patch('/pagamentos/:pid', (req, res) => {
  const { pago, forma_pagamento } = req.body;
  const now = pago ? new Date().toISOString().replace('T',' ').slice(0,19) : null;
  db.prepare('UPDATE pagamentos_aulas SET pago=?,forma_pagamento=?,pago_em=? WHERE id=?').run(pago?1:0, forma_pagamento||'pix', now, req.params.pid);
  res.json({ ok: true });
});

module.exports = router;

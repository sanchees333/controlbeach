const express = require('express');
const router = express.Router();
const db = require('../db/database');
const uid = () => require('crypto').randomUUID();

// Reservas
router.get('/reservas', (req, res) => {
  const { inicio, fim } = req.query;
  let q = 'SELECT * FROM reservas';
  const p = [];
  if (inicio && fim) { q += ' WHERE data BETWEEN ? AND ?'; p.push(inicio, fim); }
  res.json(db.prepare(q + ' ORDER BY data, hora_inicio').all(...p));
});

router.post('/reservas', (req, res) => {
  const { responsavel, quadra, data, hora_inicio, hora_fim, duracao, valor, obs } = req.body;
  const id = uid();
  db.prepare('INSERT INTO reservas (id,responsavel,quadra,data,hora_inicio,hora_fim,duracao,valor,obs) VALUES (?,?,?,?,?,?,?,?,?)').run(id,responsavel,quadra||1,data,hora_inicio,hora_fim,duracao||1,valor||0,obs||'');
  res.json(db.prepare('SELECT * FROM reservas WHERE id = ?').get(id));
});

router.delete('/reservas/:id', (req, res) => { db.prepare('DELETE FROM reservas WHERE id = ?').run(req.params.id); res.json({ ok: true }); });

// Treinos fixos
router.get('/treinos', (req, res) => res.json(db.prepare('SELECT * FROM treinos_fixos ORDER BY quadra, dia_semana').all()));
router.post('/treinos', (req, res) => {
  const { nome, quadra, dia_semana, hora_inicio, hora_fim } = req.body;
  const id = uid();
  db.prepare('INSERT INTO treinos_fixos VALUES (?,?,?,?,?,?)').run(id,nome,quadra,dia_semana,hora_inicio,hora_fim);
  res.json(db.prepare('SELECT * FROM treinos_fixos WHERE id = ?').get(id));
});
router.delete('/treinos/:id', (req, res) => { db.prepare('DELETE FROM treinos_fixos WHERE id = ?').run(req.params.id); res.json({ ok: true }); });

// Totais de quadra (aluguel e aulas)
router.get('/totais', (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  const now = new Date();
  // Início da semana (domingo)
  const weekStart = new Date(now); weekStart.setDate(now.getDate()-now.getDay()); weekStart.setHours(0,0,0,0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
  const ws = weekStart.toISOString().split('T')[0];
  const we = weekEnd.toISOString().split('T')[0];
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Aluguel de quadra via reservas
  const resHoje = db.prepare('SELECT COALESCE(SUM(duracao),0) as h, COALESCE(SUM(valor),0) as v FROM reservas WHERE data=?').get(hoje);
  const resSemana = db.prepare('SELECT COALESCE(SUM(duracao),0) as h, COALESCE(SUM(valor),0) as v FROM reservas WHERE data BETWEEN ? AND ?').get(ws,we);
  const resMes = db.prepare("SELECT COALESCE(SUM(duracao),0) as h, COALESCE(SUM(valor),0) as v FROM reservas WHERE strftime('%Y-%m',data)=?").get(mesAtual);

  // Horas de aulas (turmas ativas) — estimativa mensal
  const turmas = db.prepare('SELECT * FROM turmas WHERE ativo=1').all();
  let horasTurmasSemana = 0;
  turmas.forEach(t => {
    const dias = (t.dias_semana||'').split(',').length || 1;
    horasTurmasSemana += (t.duracao_horas||1) * dias;
  });
  const horasTurmasMes = horasTurmasSemana * 4.33;

  res.json({
    aluguel: {
      hoje: { horas: resHoje.h, valor: resHoje.v },
      semana: { horas: resSemana.h, valor: resSemana.v },
      mes: { horas: resMes.h, valor: resMes.v }
    },
    aulas: {
      semana: { horas: horasTurmasSemana },
      mes: { horas: Math.round(horasTurmasMes * 10) / 10 },
      turmas: turmas.map(t => ({
        nome: t.nome,
        dias_semana: t.dias_semana,
        hora_inicio: t.hora_inicio,
        hora_fim: t.hora_fim,
        duracao_horas: t.duracao_horas,
        alunos: db.prepare('SELECT COUNT(*) as n FROM alunos WHERE turma_id=? AND ativo=1').get(t.id)?.n || 0
      }))
    }
  });
});

module.exports = router;

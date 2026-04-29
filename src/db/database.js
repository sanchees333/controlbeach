const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/resenha.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── SCHEMA ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS eventos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    data TEXT NOT NULL,
    tipo TEXT DEFAULT 'Evento',
    ingresso REAL DEFAULT 0,
    custo_proprio REAL DEFAULT 0,
    descricao TEXT DEFAULT '',
    receita REAL DEFAULT 0,
    receita_ingresso REAL DEFAULT 0,
    ativo INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS evento_faturamentos (
    id TEXT PRIMARY KEY,
    evento_id TEXT NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    forma_pagamento TEXT NOT NULL DEFAULT 'pix',
    valor REAL NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS comandas (
    id TEXT PRIMARY KEY,
    numero INTEGER NOT NULL,
    nome TEXT NOT NULL,
    cliente_id TEXT REFERENCES clientes(id),
    total REAL DEFAULT 0,
    fechada INTEGER DEFAULT 0,
    obs TEXT DEFAULT '',
    evento_id TEXT REFERENCES eventos(id),
    criada_em TEXT DEFAULT (datetime('now','localtime')),
    fechada_em TEXT
  );

  CREATE TABLE IF NOT EXISTS comanda_pagamentos (
    id TEXT PRIMARY KEY,
    comanda_id TEXT NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    forma_pagamento TEXT NOT NULL,
    valor REAL NOT NULL,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS comanda_items (
    id TEXT PRIMARY KEY,
    comanda_id TEXT NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    prod_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    preco REAL NOT NULL,
    qty INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS despesas (
    id TEXT PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'variavel',
    valor REAL NOT NULL,
    data TEXT NOT NULL,
    evento_id TEXT REFERENCES eventos(id),
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS reservas (
    id TEXT PRIMARY KEY,
    responsavel TEXT NOT NULL,
    quadra INTEGER NOT NULL,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    duracao REAL DEFAULT 1,
    valor REAL DEFAULT 0,
    obs TEXT DEFAULT '',
    criada_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS treinos_fixos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    quadra INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS turmas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    modalidade TEXT DEFAULT 'Futevôlei',
    quadra INTEGER DEFAULT 1,
    dias_semana TEXT,
    hora_inicio TEXT,
    hora_fim TEXT,
    duracao_horas REAL DEFAULT 1,
    valor_mensal REAL DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    obs TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS alunos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    turma_id TEXT REFERENCES turmas(id),
    valor_individual REAL DEFAULT 0,
    usa_valor_turma INTEGER DEFAULT 1,
    ativo INTEGER DEFAULT 1,
    telefone TEXT DEFAULT '',
    obs TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS pagamentos_aulas (
    id TEXT PRIMARY KEY,
    aluno_id TEXT REFERENCES alunos(id),
    turma_id TEXT REFERENCES turmas(id),
    mes_referencia TEXT NOT NULL,
    valor REAL NOT NULL,
    forma_pagamento TEXT DEFAULT 'pix',
    pago INTEGER DEFAULT 0,
    pago_em TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS caixa_abertura (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL UNIQUE,
    valor_inicial REAL DEFAULT 0,
    obs TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS config (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menu_categorias (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    icone TEXT DEFAULT '🍽️',
    ordem INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_produtos (
    id TEXT PRIMARY KEY,
    categoria_id TEXT NOT NULL REFERENCES menu_categorias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    preco REAL NOT NULL,
    ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS seq (
    chave TEXT PRIMARY KEY,
    valor INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT DEFAULT '',
    obs TEXT DEFAULT '',
    total_gasto REAL DEFAULT 0,
    total_visitas INTEGER DEFAULT 0,
    ultima_visita TEXT,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS caixa_fechamento (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL UNIQUE,
    valor_inicial REAL DEFAULT 0,
    total_comandas REAL DEFAULT 0,
    total_eventos REAL DEFAULT 0,
    total_geral REAL DEFAULT 0,
    dinheiro_total REAL DEFAULT 0,
    pix_total REAL DEFAULT 0,
    debito_total REAL DEFAULT 0,
    credito_total REAL DEFAULT 0,
    obs TEXT DEFAULT '',
    fechado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS seq_dia (
    data TEXT PRIMARY KEY,
    ultimo_numero INTEGER DEFAULT 0
  );
`);

// ─── SEED ────────────────────────────────────────────────────────────────────
const cfgCount = db.prepare('SELECT COUNT(*) as n FROM config').get().n;
if (cfgCount === 0) {
  const cfgs = [
    ['aluguel_quadra_1h','80'], ['aluguel_quadra_30','45'],
    ['nome_estabelecimento','Resenha Beach'], ['active_event_id','']
  ];
  const s = db.prepare("INSERT OR IGNORE INTO config VALUES (?,?)");
  cfgs.forEach(c => s.run(c[0], c[1]));
  db.prepare("INSERT OR IGNORE INTO seq VALUES ('comanda',0)").run();
}

const menuCount = db.prepare('SELECT COUNT(*) as n FROM menu_categorias').get().n;
if (menuCount === 0) {
  const cats = [
    ['cervejas','Cervejas','🍺',1], ['refrigerantes','Refrigerantes','🥤',2],
    ['caipirinhas','Caipirinhas','🍹',3], ['energetico','Energético','⚡',4],
    ['whisky','Whisky','🥃',5], ['sucos','Sucos / Gatorade','🍊',6],
    ['combos','Combos','🎯',7], ['porcoes','Porções','🍟',8],
    ['espetos','Espetos','🍢',9], ['domingos','Acomp. Domingo','🍚',10],
    ['quadra','Quadra','🏟️',11],
  ];
  const ic = db.prepare('INSERT INTO menu_categorias VALUES (?,?,?,?)');
  cats.forEach(c => ic.run(...c));

  const prods = [
    ['p001','cervejas','Skol Garrafa',10],['p002','cervejas','Skol Lata',6],
    ['p003','cervejas','Antárctica Boa Garrafa',10],['p004','cervejas','Antárctica Boa Lata',6],
    ['p005','cervejas','Brahma Garrafa',10],['p006','cervejas','Brahma Lata',6],
    ['p007','cervejas','Amstel Garrafa',10],['p008','cervejas','Amstel Lata',6],
    ['p009','cervejas','Cristal Lata',5],['p010','cervejas','Original Garrafa',11],
    ['p011','cervejas','Heineken Garrafa',13],['p012','cervejas','Heineken Lata Zero',9],
    ['p013','cervejas','Heineken Lata',8],['p014','cervejas','Império Ultra',8],
    ['p015','cervejas','Império Gold Garrafa',10],['p016','cervejas','Império Lager Garrafa',10],
    ['p017','cervejas','Império Garrafa',10],['p018','cervejas','Império Romarinho',4],
    ['p019','cervejas','Império Gold Long Neck',7],['p020','cervejas','Império Lager Long Neck',7],
    ['p021','cervejas','Ice',8],
    ['p030','refrigerantes','Água Sem Gás',3],['p031','refrigerantes','Água Com Gás',4],
    ['p032','refrigerantes','Coca-Cola Lata',5],['p033','refrigerantes','Coca-Cola Lata Zero',5],
    ['p034','refrigerantes','Coca-Cola 2 Litros',13],['p035','refrigerantes','Coca-Cola Zero 2L',13],
    ['p036','refrigerantes','Guaraná Antárctica Lata',5],
    ['p037','refrigerantes','Guaraná Antárctica 1L',10],
    ['p038','refrigerantes','Guaraná Antárctica 2L',12],
    ['p040','caipirinhas','Velho Barreiro Limão',15],
    ['p041','caipirinhas','Velho Barreiro Maracujá',16],
    ['p042','caipirinhas','Velho Barreiro Morango',16],
    ['p050','energetico','Monster 500ml',12],['p051','energetico','Red Bull',12],
    ['p060','whisky','Whisky Dose Red Label',15],['p061','whisky','Whisky Dose Campari',12],
    ['p062','whisky','Copão de Whisky (Energético + Red Label)',25],
    ['p070','sucos','Suco Laranja',8],['p071','sucos','Suco Maracujá',8],
    ['p072','sucos','Suco Uva',8],['p073','sucos','Gatorade',8],
    ['p080','combos','Combo Whisky (1 garrafa + 6 energéticos)',210],
    ['p090','porcoes','Batata Frita 500g',25],['p091','porcoes','Batata com Cheddar e Bacon',35],
    ['p092','porcoes','Anel de Cebola 350g',30],['p093','porcoes','Frango a Passarinho 600g',35],
    ['p094','porcoes','Calabresa Acebolada 600g',30],
    ['p095','porcoes','Fraldinha em Tiras Acebolada 600g',55],
    ['p096','porcoes','Kibe Frito 12un',30],['p097','porcoes','Salgadinho Misto 15un',30],
    ['p098','porcoes','Salame e Azeitona',35],['p099','porcoes','Mussarela/Presunto/Azeitona',35],
    ['p100','porcoes','Tilápia 500g',55],['p101','porcoes','Salgado (un)',7],
    ['p110','espetos','Espeto de Carne',10],['p111','espetos','Espeto Kafta',12],
    ['p120','domingos','Porção de Arroz',8],['p121','domingos','Porção de Mandioca',10],
    ['p130','quadra','Aluguel Quadra 1h',80],['p131','quadra','Aluguel Quadra 30min',45],
  ];
  const ip = db.prepare('INSERT INTO menu_produtos VALUES (?,?,?,?,1)');
  prods.forEach(p => ip.run(...p));
}

const trCount = db.prepare('SELECT COUNT(*) as n FROM treinos_fixos').get().n;
if (trCount === 0) {
  db.prepare("INSERT INTO treinos_fixos VALUES ('tf1','Treino Futevôlei A',1,1,'18:00','20:00')").run();
  db.prepare("INSERT INTO treinos_fixos VALUES ('tf2','Treino Vôlei B',1,4,'20:00','22:00')").run();
}

const turmaCount = db.prepare('SELECT COUNT(*) as n FROM turmas').get().n;
if (turmaCount === 0) {
  const turmas = [
    ['t1','Futevôlei','Futevôlei',1,'Seg e Qua','18:00','20:00',2,150],
    ['t2','Vôlei Masculino','Vôlei',1,'Ter e Qui','19:00','21:00',2,120],
    ['t3','Vôlei Kids','Vôlei',2,'Sáb','09:00','11:00',2,100],
    ['t4','Funcional','Funcional',2,'Seg, Qua e Sex','07:00','08:00',1,130],
    ['t5','Vôlei Feminino','Vôlei',1,'Ter e Sex','20:00','22:00',2,120],
  ];
  const it = db.prepare('INSERT INTO turmas (id,nome,modalidade,quadra,dias_semana,hora_inicio,hora_fim,duracao_horas,valor_mensal,ativo) VALUES (?,?,?,?,?,?,?,?,?,1)');
  turmas.forEach(t => it.run(...t));
}

module.exports = db;

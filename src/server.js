const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/comandas',  require('./routes/comandas'));
app.use('/api/clientes',  require('./routes/clientes'));
app.use('/api/eventos',   require('./routes/eventos'));
app.use('/api/despesas',  require('./routes/despesas'));
app.use('/api/quadras',   require('./routes/quadras'));
app.use('/api/turmas',    require('./routes/turmas'));
app.use('/api/menu',      require('./routes/menu'));
app.use('/api/config',    require('./routes/config'));
app.use('/api/caixa',     require('./routes/caixa'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(PORT, () => {
  console.log(`\n🏐  Resenha Beach  →  http://localhost:${PORT}\n`);
});

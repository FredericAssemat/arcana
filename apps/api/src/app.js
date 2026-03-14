'use strict';

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const grimoireRoutes = require('./routes/grimoire');
const interpretRoutes= require('./routes/interpret');
const shareRoutes    = require('./routes/share');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' }
});
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',      authRoutes);
app.use('/api/grimoire',  grimoireRoutes);
app.use('/api/interpret', interpretRoutes);
app.use('/api/share',     shareRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Arcana API démarrée sur le port ${PORT}`);
});

module.exports = app;

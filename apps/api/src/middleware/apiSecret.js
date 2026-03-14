'use strict';

module.exports = (req, res, next) => {
  const secret = req.headers['x-api-secret'];
  if (!secret || secret !== process.env.API_SECRET) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  next();
};

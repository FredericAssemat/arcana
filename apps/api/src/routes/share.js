'use strict';

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const Grimoire       = require('../models/Grimoire');
const ShareToken     = require('../models/ShareToken');
const NatalChart     = require('../models/NatalChart');
const NumProfile     = require('../models/NumProfile');
const CrossedProfile = require('../models/CrossedProfile');
const Narrative      = require('../models/Narrative');

const { computeNatalChart } = require('@arcana/engine/astroEngine');
const { computeDual }       = require('@arcana/engine/numerology');
const { crossProfiles, buildNumEntries } = require('@arcana/engine/crossEngine');
const { selectStones }      = require('@arcana/engine/lithotherapy');

const { DateTime } = require('luxon');
const { v4: uuidv4 } = require('uuid');

async function geocode(cityName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
  const res  = await fetch(url, { headers: { 'User-Agent': 'ArcanaApp/1.0' } });
  const data = await res.json();
  if (!data[0]) throw new Error('Ville non trouvée');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// POST /api/share — créer un grimoire pour quelqu'un d'autre
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      firstName, lastName, birthDate,
      birthTime, birthCity, timezone,
      recipientEmail,
    } = req.body;

    if (!firstName || !lastName || !birthDate || !birthCity) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // Vérifier limite : max 3 tokens actifs par utilisateur
    const activeTokens = await ShareToken.count({
      where: {
        senderId:  req.userId,
        claimedAt: null,
        expiresAt: { [require('sequelize').Op.gt]: new Date() },
      }
    });
    if (activeTokens >= 3) {
      return res.status(429).json({
        error: 'Maximum 3 grimoires partagés actifs. Attendez qu\'un destinataire accepte ou que les tokens expirent.'
      });
    }

    // Calculs
    const coords    = await geocode(birthCity);
    const tz        = timezone || 'Europe/Paris';
    const dt        = DateTime.fromISO(`${birthDate}T${birthTime || '12:00'}`, { zone: tz });
    const tzOffsetH = dt.offset / 60;

    const natal    = computeNatalChart({
      isoDate: birthDate, timeStr: birthTime || '12:00',
      latDeg: coords.lat, lonDeg: coords.lon, tzOffsetH,
    });
    const dual     = computeDual(firstName, lastName, birthDate);
    const entries  = buildNumEntries(dual);
    const crossing = crossProfiles(natal, entries);
    const stones   = selectStones(crossing.archetypeAxes, crossing.tensions, 3);

    // Créer le grimoire sans userId (sera lié quand le destinataire crée son compte)
    const grimoire = await Grimoire.create({
      userId:    req.userId,
      firstName, lastName, birthDate,
      birthTime: birthTime || null,
      birthCity,
      birthLat:  coords.lat,
      birthLon:  coords.lon,
      timezone:  tz,
      isOwn:     false,
    });

    await NatalChart.create({
      grimoireId:  grimoire.id,
      planetsJson: JSON.stringify(natal.planets),
      ascendant:   natal.ascendant ? natal.ascendant.sign : null,
      midheaven:   natal.midheaven ? natal.midheaven.sign : null,
      housesJson:  JSON.stringify(natal.houses),
      julianDay:   natal.julianDay,
      houseSystem: natal.houseSystem,
      timeKnown:   natal.timeKnown,
    });

    await NumProfile.create({
      grimoireId:    grimoire.id,
      pythJson:      JSON.stringify(dual.pythagorean),
      kabJson:       JSON.stringify(dual.kabbalistic),
      synthesisJson: JSON.stringify(dual.deltas),
    });

    await CrossedProfile.create({
      grimoireId:        grimoire.id,
      archetypeAxesJson: JSON.stringify(crossing.archetypeAxes),
      convergencesJson:  JSON.stringify(crossing.convergences),
      tensionsJson:      JSON.stringify(crossing.tensions),
      dominantsJson:     JSON.stringify(crossing.dominants),
      lacksJson:         JSON.stringify(crossing.lacks),
      stonesJson:        JSON.stringify(stones),
    });

    // Créer le token de partage (expire dans 7 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const shareToken = await ShareToken.create({
      senderId:       req.userId,
      grimoireId:     grimoire.id,
      token:          uuidv4(),
      recipientEmail: recipientEmail || null,
      expiresAt,
    });

    res.status(201).json({
      token:      shareToken.token,
      expiresAt:  shareToken.expiresAt,
      grimoireId: grimoire.id,
      shareUrl:   `${process.env.APP_URL || 'https://arcana.app'}/grimoire/${shareToken.token}`,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// GET /api/share/:token — récupérer un grimoire partagé via token
router.get('/:token', async (req, res) => {
  try {
    const shareToken = await ShareToken.findOne({
      where: { token: req.params.token }
    });

    if (!shareToken) {
      return res.status(404).json({ error: 'Token invalide' });
    }
    if (new Date() > shareToken.expiresAt) {
      return res.status(410).json({ error: 'Ce lien a expiré' });
    }

    const grimoire = await Grimoire.findByPk(shareToken.grimoireId);
    const [natal, num, crossed, narrative] = await Promise.all([
      NatalChart.findOne({     where: { grimoireId: grimoire.id } }),
      NumProfile.findOne({     where: { grimoireId: grimoire.id } }),
      CrossedProfile.findOne({ where: { grimoireId: grimoire.id } }),
      Narrative.findOne({      where: { grimoireId: grimoire.id } }),
    ]);

    res.json({
      grimoire: {
        firstName: grimoire.firstName,
        lastName:  grimoire.lastName,
        birthDate: grimoire.birthDate,
        birthCity: grimoire.birthCity,
      },
      natal: natal ? {
        planets:   JSON.parse(natal.planetsJson),
        ascendant: natal.ascendant,
        midheaven: natal.midheaven,
        timeKnown: natal.timeKnown,
      } : null,
      numerology: num ? {
        pythagorean: JSON.parse(num.pythJson),
        kabbalistic: JSON.parse(num.kabJson),
      } : null,
      crossing: crossed ? {
        archetypeAxes: JSON.parse(crossed.archetypeAxesJson),
        dominants:     JSON.parse(crossed.dominantsJson),
        stones:        JSON.parse(crossed.stonesJson),
      } : null,
      narrative:  narrative ? narrative.text : null,
      tokenInfo: {
        expiresAt:  shareToken.expiresAt,
        claimedAt:  shareToken.claimedAt,
      },
    });

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/share/:token/claim — réclamer un grimoire partagé
router.post('/:token/claim', authMiddleware, async (req, res) => {
  try {
    const shareToken = await ShareToken.findOne({
      where: { token: req.params.token }
    });

    if (!shareToken) {
      return res.status(404).json({ error: 'Token invalide' });
    }
    if (new Date() > shareToken.expiresAt) {
      return res.status(410).json({ error: 'Ce lien a expiré' });
    }
    if (shareToken.claimedAt) {
      return res.status(409).json({ error: 'Ce grimoire a déjà été réclamé' });
    }

    // Transférer le grimoire au nouveau propriétaire
    await Grimoire.update(
      { userId: req.userId, isOwn: true },
      { where: { id: shareToken.grimoireId } }
    );

    // Marquer le token comme utilisé
    await shareToken.update({ claimedAt: new Date() });

    res.json({
      success:    true,
      grimoireId: shareToken.grimoireId,
    });

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

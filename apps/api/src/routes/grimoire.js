'use strict';

const express       = require('express');
const router        = express.Router();
const authMiddleware = require('../middleware/auth');
const Grimoire      = require('../models/Grimoire');
const NatalChart    = require('../models/NatalChart');
const NumProfile    = require('../models/NumProfile');
const CrossedProfile = require('../models/CrossedProfile');
const Narrative     = require('../models/Narrative');

const { computeNatalChart } = require('@arcana/engine/astroEngine');
const { computeDual }       = require('@arcana/engine/numerology');
const { crossProfiles, buildNumEntries } = require('@arcana/engine/crossEngine');
const { selectStones }      = require('@arcana/engine/lithotherapy');

const { DateTime } = require('luxon');

async function geocode(cityName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
  const res  = await fetch(url, {
    headers: { 'User-Agent': 'ArcanaApp/1.0' }
  });
  const data = await res.json();
  if (!data[0]) throw new Error('Ville non trouvée');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// POST /api/grimoire — créer un grimoire complet
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      firstName, lastName, birthDate,
      birthTime, birthCity, timezone
    } = req.body;

    if (!firstName || !lastName || !birthDate || !birthCity) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // 1. Géocoding
    const coords = await geocode(birthCity);

    // 2. Résolution fuseau horaire
    const tz = timezone || 'Europe/Paris';
    const dt = DateTime.fromISO(
      `${birthDate}T${birthTime || '12:00'}`,
      { zone: tz }
    );
    const tzOffsetH = dt.offset / 60;

    // 3. Calculs locaux
    const natal = computeNatalChart({
      isoDate:   birthDate,
      timeStr:   birthTime || '12:00',
      latDeg:    coords.lat,
      lonDeg:    coords.lon,
      tzOffsetH,
    });

    const dual     = computeDual(firstName, lastName, birthDate);
    const entries  = buildNumEntries(dual);
    const crossing = crossProfiles(natal, entries);
    const stones   = selectStones(
      crossing.archetypeAxes,
      crossing.tensions,
      3
    );

    // 4. Sauvegarder en base
    const grimoire = await Grimoire.create({
      userId:    req.userId,
      firstName, lastName, birthDate,
      birthTime: birthTime || null,
      birthCity,
      birthLat:  coords.lat,
      birthLon:  coords.lon,
      timezone:  tz,
      isOwn:     true,
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

    res.status(201).json({
      grimoireId: grimoire.id,
      natal,
      numerology: dual,
      crossing,
      stones,
      narrativeStatus: 'pending',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// GET /api/grimoire — liste des grimoires de l'utilisateur
router.get('/', authMiddleware, async (req, res) => {
  try {
    const grimoires = await Grimoire.findAll({
      where:   { userId: req.userId },
      order:   [['createdAt', 'DESC']],
      attributes: ['id', 'firstName', 'lastName', 'birthDate', 'birthCity', 'isOwn', 'createdAt'],
    });
    res.json({ grimoires });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/grimoire/:id — détail complet d'un grimoire
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const grimoire = await Grimoire.findOne({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!grimoire) {
      return res.status(404).json({ error: 'Grimoire non trouvé' });
    }

    const [natal, num, crossed, narrative] = await Promise.all([
      NatalChart.findOne({    where: { grimoireId: grimoire.id } }),
      NumProfile.findOne({    where: { grimoireId: grimoire.id } }),
      CrossedProfile.findOne({ where: { grimoireId: grimoire.id } }),
      Narrative.findOne({     where: { grimoireId: grimoire.id } }),
    ]);

    res.json({
      grimoire,
      natal: natal ? {
        ...natal.toJSON(),
        planets: JSON.parse(natal.planetsJson),
        houses:  JSON.parse(natal.housesJson),
      } : null,
      numerology: num ? {
        pythagorean: JSON.parse(num.pythJson),
        kabbalistic: JSON.parse(num.kabJson),
        deltas:      JSON.parse(num.synthesisJson),
      } : null,
      crossing: crossed ? {
        archetypeAxes: JSON.parse(crossed.archetypeAxesJson),
        convergences:  JSON.parse(crossed.convergencesJson),
        tensions:      JSON.parse(crossed.tensionsJson),
        dominants:     JSON.parse(crossed.dominantsJson),
        lacks:         JSON.parse(crossed.lacksJson),
        stones:        JSON.parse(crossed.stonesJson),
      } : null,
      narrative: narrative ? narrative.text : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

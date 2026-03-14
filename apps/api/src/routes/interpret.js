'use strict';

const express    = require('express');
const router     = express.Router();
const authMiddleware = require('../middleware/auth');
const Grimoire       = require('../models/Grimoire');
const NatalChart     = require('../models/NatalChart');
const NumProfile     = require('../models/NumProfile');
const CrossedProfile = require('../models/CrossedProfile');
const Narrative      = require('../models/Narrative');
const Anthropic      = require('@anthropic-ai/sdk');

const client = new Anthropic();

function buildPrompt(data) {
  const { grimoire, natal, numerology, crossing } = data;
  const { pythagorean: p, kabbalistic: k, deltas } = numerology;

  const sun     = natal.planets.find(pl => pl.name === 'sun');
  const moon    = natal.planets.find(pl => pl.name === 'moon');
  const mercury = natal.planets.find(pl => pl.name === 'mercury');
  const venus   = natal.planets.find(pl => pl.name === 'venus');
  const mars    = natal.planets.find(pl => pl.name === 'mars');
  const saturn  = natal.planets.find(pl => pl.name === 'saturn');

  const axesText = Object.entries(crossing.archetypeAxes)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  • ${k}: ${v}/100`)
    .join('\n');

  const deltaText = Object.entries(deltas)
    .map(([key, val]) => {
      if (val === 'identique')
        return `  • ${key}: ${p[key]} (confirmé par les 2 systèmes)`;
      if (val === 'amplification_kab')
        return `  • ${key}: ${p[key]} (Pythagore) → ${k[key]} (Kabbale révèle un nombre maître)`;
      return `  • ${key}: tension ${p[key]} (Pythagore) vs ${k[key]} (Kabbale)`;
    }).join('\n');

  return `Tu es un interprète de symbolique intérieure. Ton rôle est d'offrir un miroir précis et bienveillant de la nature profonde de la personne, révélée par le croisement de son thème astral et de son profil numérologique.

Tu parles directement à la personne en la tutoyant. Ton ton est chaleureux, nuancé, jamais mystique à l'excès. Tu évites les superlatifs vides et les formulations universelles. Chaque affirmation est ancrée dans les données du profil.

PROFIL DE ${grimoire.firstName.toUpperCase()} ${grimoire.lastName.toUpperCase()}
Né·e le ${grimoire.birthDate}${grimoire.birthTime ? ` à ${grimoire.birthTime}` : ''} à ${grimoire.birthCity}

THÈME ASTRAL
Soleil : ${sun?.sign} (maison ${sun?.house})
Lune : ${moon?.sign} (maison ${moon?.house})${moon?.retrograde ? ' — rétrograde' : ''}
Ascendant : ${natal.ascendant ? natal.ascendant.sign : 'inconnu (heure non fournie)'}
Milieu du Ciel : ${natal.midheaven ? natal.midheaven.sign : 'inconnu'}
Mercure : ${mercury?.sign}${mercury?.retrograde ? ' Rx' : ''}
Vénus : ${venus?.sign} — Mars : ${mars?.sign} — Saturne : ${saturn?.sign}${saturn?.retrograde ? ' Rx' : ''}

NUMÉROLOGIE DUALE
Chemin de vie : ${p.lifePath} (universel)
${deltaText}

AXES ARCHÉTYPAUX (0–100)
${axesText}

DOMINANTS : ${crossing.dominants.join(', ')}
À DÉVELOPPER : ${crossing.lacks.length ? crossing.lacks.join(', ') : 'aucun axe déficient notable'}

CONVERGENCES FORTES : ${crossing.convergences.slice(0, 3).map(c => c.arch).join(', ') || 'aucune'}
TENSIONS : ${crossing.tensions.slice(0, 3).map(t => t.arch).join(', ') || 'aucune'}

Rédige une synthèse personnalisée en 4 parties qui s'enchaînent naturellement, sans titres apparents :
1. L'essence fondamentale (150 mots) — commence par une phrase-image mémorable et spécifique
2. Les frictions internes (120 mots) — formule chaque tension comme une invitation, jamais comme un défaut
3. Ce qui reste à cultiver (100 mots) — les axes faibles comme territoire à explorer
4. Les pierres alliées (80 mots) — introduis les pierres de façon narrative, explique pourquoi chacune correspond à ce profil précis

Règles absolues :
— Ne jamais prédire d'événements futurs précis
— Ne jamais utiliser : destin, karma, âme sœur, élu, exceptionnel
— Reformuler tout "tu as du mal à" en "tu es invité à apprendre"
— Terminer sur une ouverture, jamais sur une limitation
— Longueur totale : 450–500 mots. Texte courant, pas de titres ni de puces.`;
}

// POST /api/interpret/:grimoireId
router.post('/:grimoireId', authMiddleware, async (req, res) => {
  try {
    const { grimoireId } = req.params;

    // Vérifier que le grimoire appartient à l'utilisateur
    const grimoire = await Grimoire.findOne({
      where: { id: grimoireId, userId: req.userId }
    });
    if (!grimoire) {
      return res.status(404).json({ error: 'Grimoire non trouvé' });
    }

    // Vérifier si une narrative existe déjà en cache
    const existing = await Narrative.findOne({ where: { grimoireId } });
    if (existing) {
      return res.json({ narrative: existing.text, cached: true });
    }

    // Charger toutes les données
    const [natal, num, crossed] = await Promise.all([
      NatalChart.findOne({    where: { grimoireId } }),
      NumProfile.findOne({    where: { grimoireId } }),
      CrossedProfile.findOne({ where: { grimoireId } }),
    ]);

    if (!natal || !num || !crossed) {
      return res.status(400).json({ error: 'Profil incomplet — recréer le grimoire' });
    }

    const data = {
      grimoire,
      natal: {
        ...natal.toJSON(),
        planets:  JSON.parse(natal.planetsJson),
        houses:   JSON.parse(natal.housesJson),
        ascendant: natal.ascendant ? { sign: natal.ascendant } : null,
        midheaven: natal.midheaven ? { sign: natal.midheaven } : null,
      },
      numerology: {
        pythagorean: JSON.parse(num.pythJson),
        kabbalistic: JSON.parse(num.kabJson),
        deltas:      JSON.parse(num.synthesisJson),
      },
      crossing: {
        archetypeAxes: JSON.parse(crossed.archetypeAxesJson),
        convergences:  JSON.parse(crossed.convergencesJson),
        tensions:      JSON.parse(crossed.tensionsJson),
        dominants:     JSON.parse(crossed.dominantsJson),
        lacks:         JSON.parse(crossed.lacksJson),
        stones:        JSON.parse(crossed.stonesJson),
      },
    };

    const prompt = buildPrompt(data);

    // Appel Claude API
    const message = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    });

    const narrative  = message.content[0].text;
    const tokensUsed = message.usage?.input_tokens + message.usage?.output_tokens;

    // Sauvegarder en cache définitif
    await Narrative.create({
      grimoireId,
      text:       narrative,
      model:      'claude-sonnet-4-5',
      tokensUsed: tokensUsed || null,
    });

    res.json({ narrative, cached: false });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;

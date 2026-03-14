
'use strict';

const STONES = require('./stones.json');

const THRESHOLDS = {
  lack:    35,
  strong:  72,
  excess:  85,
  tension: 15,
};

const OPPOSITION_PAIRS = [
  ['leadership',     'intuition'    ],
  ['structure',      'creativity'   ],
  ['power',          'love'         ],
  ['transformation', 'structure'    ],
  ['spirituality',   'leadership'   ],
];

function buildCandidates(archetypeAxes, tensions) {
  const candidates = [];

  for (const [arch, score] of Object.entries(archetypeAxes)) {
    if (score < THRESHOLDS.lack) {
      candidates.push({
        action: 'bring',
        arch,
        score:  100 - score,
        reason: `Axe "${arch}" insuffisant (${score}/100)`,
      });
    } else if (score >= THRESHOLDS.excess) {
      candidates.push({
        action: 'protect',
        arch,
        score:  score * 0.5,
        reason: `Axe "${arch}" très dominant (${score}/100)`,
      });
    } else if (score >= THRESHOLDS.strong) {
      candidates.push({
        action: 'amplify',
        arch,
        score:  score * 0.4,
        reason: `Axe "${arch}" fort (${score}/100)`,
      });
    }
  }

  for (const [a, b] of OPPOSITION_PAIRS) {
    const sA    = archetypeAxes[a] ?? 50;
    const sB    = archetypeAxes[b] ?? 50;
    const delta = Math.abs(sA - sB);
    if (delta > THRESHOLDS.tension && sA > 55 && sB > 55) {
      candidates.push({
        action: 'balance',
        arch:   sA > sB ? a : b,
        archB:  sA > sB ? b : a,
        score:  delta * 0.8,
        reason: `Tension ${a} (${sA}) vs ${b} (${sB})`,
      });
    }
  }

  for (const t of (tensions || []).slice(0, 3)) {
    candidates.push({
      action: 'balance',
      arch:   t.arch,
      score:  t.score * 0.6,
      reason: `Tension astro-numérologique sur "${t.arch}"`,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function scoreStone(stone, candidate) {
  let s = 0;
  if (!stone.actions[candidate.action]) return 0;
  if (stone.archs.includes(candidate.arch))           s += 50;
  if (candidate.archB && stone.archs.includes(candidate.archB)) s += 30;
  if (candidate.action === 'balance' && stone.tensionBridge?.length > 0) s += 20;
  return s;
}

function selectStones(archetypeAxes, tensions, count = 3) {
  const candidates = buildCandidates(archetypeAxes, tensions);
  const selected   = [];
  const usedStones = new Set();
  const usedArchs  = new Set();

  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (usedArchs.has(candidate.arch)) continue;

    const matches = STONES
      .map(stone => ({ stone, fit: scoreStone(stone, candidate) }))
      .filter(m => m.fit > 0 && !usedStones.has(m.stone.id))
      .sort((a, b) => b.fit - a.fit);

    if (!matches[0]) continue;

    const best = matches[0];
    selected.push({
      ...best.stone,
      action:   candidate.action,
      arch:     candidate.arch,
      fit:      best.fit,
      priority: candidate.score,
      why:      candidate.reason,
    });

    usedStones.add(best.stone.id);
    usedArchs.add(candidate.arch);
  }

  return selected;
}

module.exports = { selectStones, THRESHOLDS };
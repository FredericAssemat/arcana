'use strict';

const PLANET_MAP = {
  sun:     { nums:[1,4],  archs:['leadership','structure'],          elem:'fire',  weight:3 },
  moon:    { nums:[2,7],  archs:['intuition','spirituality'],        elem:'water', weight:3 },
  mercury: { nums:[5],    archs:['communication'],                   elem:'air',   weight:2 },
  venus:   { nums:[6],    archs:['love'],                            elem:'earth', weight:2 },
  mars:    { nums:[9,1],  archs:['leadership','power'],              elem:'fire',  weight:2 },
  jupiter: { nums:[3],    archs:['creativity'],                      elem:'fire',  weight:2 },
  saturn:  { nums:[4,8],  archs:['structure','power'],               elem:'earth', weight:2 },
  uranus:  { nums:[11],   archs:['spirituality','leadership'],       elem:'air',   weight:1 },
  neptune: { nums:[7],    archs:['spirituality','intuition'],        elem:'water', weight:1 },
  pluto:   { nums:[22],   archs:['transformation','power'],         elem:'water', weight:1 },
};

const NUM_MAP = {
  1:  { archs:['leadership'],                    elem:'fire'  },
  2:  { archs:['intuition','love'],              elem:'water' },
  3:  { archs:['creativity','communication'],    elem:'fire'  },
  4:  { archs:['structure'],                     elem:'earth' },
  5:  { archs:['communication'],                 elem:'air'   },
  6:  { archs:['love','creativity'],             elem:'earth' },
  7:  { archs:['spirituality','intuition'],      elem:'water' },
  8:  { archs:['power','structure'],             elem:'earth' },
  9:  { archs:['transformation','leadership'],   elem:'fire'  },
  11: { archs:['spirituality','intuition'],      elem:'air'   },
  22: { archs:['power','structure'],             elem:'earth' },
  33: { archs:['love','creativity'],             elem:'water' },
};

const ELEM_COMPAT = {
  fire:  { fire:1,  air:0.5,  earth:-0.5, water:-1   },
  earth: { earth:1, water:0.5, fire:-0.5, air:-1     },
  air:   { air:1,   fire:0.5,  water:-0.5, earth:-1  },
  water: { water:1, earth:0.5, air:-0.5,   fire:-1   },
};

const SIGN_ELEM = {
  aries:'fire', taurus:'earth', gemini:'air',   cancer:'water',
  leo:'fire',   virgo:'earth',  libra:'air',    scorpio:'water',
  sagittarius:'fire', capricorn:'earth', aquarius:'air', pisces:'water',
};

const AXES = [
  'leadership','intuition','creativity','structure',
  'transformation','communication','love','spirituality','power'
];

function crossProfiles(natal, numEntries) {
  const aScores  = Object.fromEntries(AXES.map(a => [a, 0]));
  const aWeights = Object.fromEntries(AXES.map(a => [a, 0]));
  const events   = [];

  for (const planet of natal.planets) {
    const pm = PLANET_MAP[planet.name];
    if (!pm) continue;
    const pElem = SIGN_ELEM[planet.sign] || pm.elem;

    for (const ne of numEntries) {
      const nm = NUM_MAP[ne.v];
      if (!nm) continue;
      const es = ELEM_COMPAT[pElem]?.[nm.elem] ?? 0;
      const pw = pm.weight * ne.w;
      const shared = pm.archs.filter(a => nm.archs.includes(a));
      const all    = [...new Set([...pm.archs, ...nm.archs])];

      for (const arch of all) {
        const isSh = shared.includes(arch);
        const c    = isSh ? pw * (1 + es) : pw * es * 0.5;
        aScores[arch]  += c;
        aWeights[arch] += pw;
        if (Math.abs(es) >= 0.5 && isSh) {
          events.push({
            type:   es > 0 ? 'convergence' : 'tension',
            planet: planet.name,
            num:    ne.key,
            arch,
            score:  Math.round(Math.abs(es) * pw * 10),
          });
        }
      }
    }
  }

  const archetypeAxes = {};
  for (const ax of AXES) {
    const raw = aWeights[ax] > 0 ? aScores[ax] / aWeights[ax] : 0;
    archetypeAxes[ax] = Math.round(Math.max(0, Math.min(1, (raw + 1) / 2)) * 100);
  }

  events.sort((a, b) => b.score - a.score);
  const sorted      = Object.entries(archetypeAxes).sort((a, b) => b[1] - a[1]);
  const dominants   = sorted.slice(0, 3).map(([k]) => k);
  const lacks       = sorted.filter(([,v]) => v < 35).map(([k]) => k);
  const convergences = events.filter(e => e.type === 'convergence').slice(0, 5);
  const tensions     = events.filter(e => e.type === 'tension').slice(0, 5);

  return { archetypeAxes, convergences, tensions, dominants, lacks };
}

function buildNumEntries(dual) {
  const { pythagorean: p, kabbalistic: k, deltas } = dual;
  const entries = [];

  const keys = ['lifePath','expression','soul','personality','hereditary','birthday'];
  const weights = { lifePath:3, expression:2, soul:2, personality:1, hereditary:1, birthday:1 };

  for (const key of keys) {
    const w = weights[key];
    if (deltas && deltas[key] === 'divergence') {
      entries.push({ key: `${key}_pyth`, v: p[key], w: w * 0.7 });
      entries.push({ key: `${key}_kab`,  v: k[key], w: w * 0.7 });
    } else if (deltas && deltas[key] === 'amplification_kab') {
      entries.push({ key, v: k[key], w: w * 1.8 });
      if (p[key]) entries.push({ key: `${key}_pyth`, v: p[key], w: w * 0.3 });
    } else {
      entries.push({ key, v: p[key], w: w * (deltas?.[key] === 'identique' ? 1.5 : 1.0) });
    }
  }

  return entries;
}

module.exports = { crossProfiles, buildNumEntries, AXES, PLANET_MAP, NUM_MAP };

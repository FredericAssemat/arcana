'use strict';

const { computeNatalChart } = require('../astroEngine');
const { computeDual }       = require('../numerology');
const { crossProfiles, buildNumEntries } = require('../crossEngine');
const { selectStones }      = require('../lithotherapy');

let passed = 0;
let failed = 0;

function assert(label, condition, got, expected) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label} — attendu: ${expected}, obtenu: ${got}`);
    failed++;
  }
}

console.log('\n=== TEST 1 — Julian Day J2000 ===');
{
  const { toJDE } = require('../astroEngine');
  const jde = toJDE('2000-01-01', '12:00', 0);
  assert('JDE J2000 = 2451545.0', Math.abs(jde - 2451545.0) < 0.01, jde.toFixed(2), '2451545.0');
}

console.log('\n=== TEST 2 — Soleil en Capricorne le 1er janvier 2000 ===');
{
  const chart = computeNatalChart({
    isoDate: '2000-01-01', timeStr: '12:00',
    latDeg: 48.85, lonDeg: 2.35, tzOffsetH: 1
  });
  const sun = chart.planets.find(p => p.name === 'sun');
  assert('Soleil en Capricorne', sun.sign === 'capricorn', sun.sign, 'capricorn');
}

console.log('\n=== TEST 3 — Soleil en Bélier à l\'équinoxe ===');
{
  const chart = computeNatalChart({
    isoDate: '2000-03-20', timeStr: '12:00',
    latDeg: 48.85, lonDeg: 2.35, tzOffsetH: 1
  });
  const sun = chart.planets.find(p => p.name === 'sun');
  assert('Soleil en Bélier (équinoxe)', sun.sign === 'aries', sun.sign, 'aries');
}

console.log('\n=== TEST 4 — Numérologie Marie Dupont 14/03/1990 ===');
{
  const dual = computeDual('Marie', 'Dupont', '1990-03-14');
  assert('Chemin de vie = 9',
    dual.lifePath === 9, dual.lifePath, 9);
  assert('Chemin de vie identique dans les deux systèmes',
    dual.pythagorean.lifePath === dual.kabbalistic.lifePath,
    `${dual.pythagorean.lifePath} vs ${dual.kabbalistic.lifePath}`, 'identiques');
  assert('Expression pythagoricienne calculée',
    typeof dual.pythagorean.expression === 'number',
    dual.pythagorean.expression, 'number');
  assert('Âme kabbalistique calculée',
    typeof dual.kabbalistic.soul === 'number',
    dual.kabbalistic.soul, 'number');
}

console.log('\n=== TEST 5 — Croisement astro-numérologique ===');
{
  const chart = computeNatalChart({
    isoDate: '1990-03-14', timeStr: '08:35',
    latDeg: 48.85, lonDeg: 2.35, tzOffsetH: 1
  });
  const dual    = computeDual('Marie', 'Dupont', '1990-03-14');
  const entries = buildNumEntries(dual);
  const result  = crossProfiles(chart, entries);

  assert('archetypeAxes contient 9 axes',
    Object.keys(result.archetypeAxes).length === 9,
    Object.keys(result.archetypeAxes).length, 9);
  assert('Tous les scores entre 0 et 100',
    Object.values(result.archetypeAxes).every(v => v >= 0 && v <= 100),
    JSON.stringify(result.archetypeAxes), 'tous entre 0 et 100');
  assert('dominants contient 3 éléments',
    result.dominants.length === 3,
    result.dominants.length, 3);
}

console.log('\n=== TEST 6 — Sélection des pierres ===');
{
  const axes = {
    leadership: 78, intuition: 91, creativity: 55,
    structure: 32,  transformation: 88, communication: 47,
    love: 61,       spirituality: 95,   power: 44
  };
  const stones = selectStones(axes, [], 3);
  assert('3 pierres sélectionnées', stones.length === 3, stones.length, 3);
  assert('Chaque pierre a un nom',
    stones.every(s => typeof s.name === 'string'),
    stones.map(s => s.name).join(', '), '3 noms');
  assert('Chaque pierre a une action',
    stones.every(s => ['bring','amplify','balance','protect'].includes(s.action)),
    stones.map(s => s.action).join(', '), 'actions valides');
  console.log(`  Pierres sélectionnées : ${stones.map(s => `${s.name} (${s.action})`).join(' | ')}`);
}

console.log('\n' + '='.repeat(40));
console.log(`Résultat : ${passed} tests réussis, ${failed} échecs`);
if (failed > 0) {
  console.log('⚠ Certains tests ont échoué — vérifier avant de continuer.');
  process.exit(1);
} else {
  console.log('✓ Tous les tests sont verts — moteur validé.');
}
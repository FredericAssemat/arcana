'use strict';

const TABLES = {
  pythagorean: {
    a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,
    j:1,k:2,l:3,m:4,n:5,o:6,p:7,q:8,r:9,
    s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8,
  },
  kabbalistic: {
    a:1,b:2,c:3,d:4,e:5,f:8,g:3,h:5,i:1,
    j:1,k:2,l:3,m:4,n:5,o:7,p:8,q:1,r:2,
    s:3,t:4,u:6,v:6,w:6,x:5,y:1,z:7,
  },
};

const VOWELS_PYTH = new Set(['a','e','i','o','u','y']);
const VOWELS_KAB  = new Set(['a','e','i','o','u']);
const MASTERS     = new Set([11, 22, 33]);

function reduce(n) {
  while (n > 9 && !MASTERS.has(n))
    n = [...String(n)].reduce((s, d) => s + Number(d), 0);
  return n;
}

function normalize(str) {
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z]/g, '');
}

function sumLetters(str, table, vowelSet, filter = 'all') {
  const chars = normalize(str).split('');
  const filtered = filter === 'vowels'     ? chars.filter(c =>  vowelSet.has(c))
                 : filter === 'consonants' ? chars.filter(c => !vowelSet.has(c))
                 : chars;
  return reduce(filtered.reduce((s, c) => s + (table[c] || 0), 0));
}

function computeSystem(firstName, lastName, birthDate, system = 'pythagorean') {
  const table  = TABLES[system];
  const vowels = system === 'kabbalistic' ? VOWELS_KAB : VOWELS_PYTH;
  const full   = `${firstName} ${lastName}`;
  const d      = Number(birthDate.split('-')[2]);

  return {
    system,
    lifePath:    reduce([...birthDate.replace(/-/g,'')].reduce((s,c) => s + Number(c), 0)),
    expression:  sumLetters(full, table, vowels, 'all'),
    soul:        sumLetters(full, table, vowels, 'vowels'),
    personality: sumLetters(full, table, vowels, 'consonants'),
    hereditary:  sumLetters(lastName, table, vowels, 'all'),
    birthday:    reduce(d),
  };
}

function computeDual(firstName, lastName, birthDate) {
  const pyth = computeSystem(firstName, lastName, birthDate, 'pythagorean');
  const kab  = computeSystem(firstName, lastName, birthDate, 'kabbalistic');

  const deltas = {};
  ['expression','soul','personality','hereditary'].forEach(k => {
    deltas[k] = pyth[k] === kab[k]    ? 'identique'
              : MASTERS.has(kab[k])   ? 'amplification_kab'
              : 'divergence';
  });

  return { pythagorean: pyth, kabbalistic: kab, deltas, lifePath: pyth.lifePath };
}

module.exports = { computeDual, computeSystem, TABLES, MASTERS, reduce, normalize };

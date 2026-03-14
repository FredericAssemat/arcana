'use strict';

const { julian, moonposition, sidereal, nutation } = require('astronomia');
const path = require('path');
const dataDir = path.join(
  path.dirname(require.resolve('astronomia/package.json')),
  'data'
);
const vsop = {
  mercury: require(path.join(dataDir, 'vsop87Bmercury.js')).default,
  venus:   require(path.join(dataDir, 'vsop87Bvenus.js')).default,
  mars:    require(path.join(dataDir, 'vsop87Bmars.js')).default,
  jupiter: require(path.join(dataDir, 'vsop87Bjupiter.js')).default,
  saturn:  require(path.join(dataDir, 'vsop87Bsaturn.js')).default,
  uranus:  require(path.join(dataDir, 'vsop87Buranus.js')).default,
  neptune: require(path.join(dataDir, 'vsop87Bneptune.js')).default,
};

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;
const SIGNS = [
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces'
];

const norm360 = deg => ((deg % 360) + 360) % 360;

const lonToSign = lon => ({
  sign:   SIGNS[Math.floor(norm360(lon) / 30)],
  degree: parseFloat((norm360(lon) % 30).toFixed(2)),
});

function toJDE(isoDate, timeStr, tzOffsetH = 0) {
  const [y, m, d]  = isoDate.split('-').map(Number);
  const [hh, mm]   = (timeStr || '12:00').split(':').map(Number);
  const utcDecimal  = d + (hh + mm / 60 - tzOffsetH) / 24;
  return julian.CalendarGregorianToJD(y, m, utcDecimal);
}

function obliquity(jde) {
  const T  = (jde - 2451545.0) / 36525;
  const e0 = 23.439291111
           - 0.013004167 * T
           - 0.000000164 * T * T
           + 0.000000504 * T * T * T;
  const nut = nutation.nutation(jde);
  return e0 + nut.deltaEpsilon * R2D;
}

function computeAngles(jde, latDeg, lonDeg) {
  const gst     = sidereal.apparent(jde);
  const gstDeg  = norm360(gst * R2D);
  const ramc    = norm360(gstDeg + lonDeg);
  const ramcR   = ramc * D2R;
  const eps     = obliquity(jde) * D2R;
  const latR    = latDeg * D2R;
  const mc = norm360(Math.atan2(Math.tan(ramcR), Math.cos(eps)) * R2D);
  const ascRaw = Math.atan2(
    Math.cos(ramcR),
    -(Math.sin(ramcR) * Math.cos(eps) + Math.tan(latR) * Math.sin(eps))
  ) * R2D;
  const asc = norm360(ascRaw);
  return { ascendant: lonToSign(asc), midheaven: lonToSign(mc), ascDeg: asc, mcDeg: mc };
}

function equalHouses(ascDeg) {
  return Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    ...lonToSign(norm360(ascDeg + i * 30)),
  }));
}

function getHouseNum(planetLon, ascDeg) {
  const offset = norm360(planetLon - ascDeg);
  return Math.floor(offset / 30) + 1;
}

function computeSun(jde) {
  const T = (jde - 2451545.0) / 36525.0;
  const L0 = ((280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360 + 360) % 360;
  const M  = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360 + 360) % 360;
  const Mrad = M * D2R;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
           + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
           + 0.000289 * Math.sin(3 * Mrad);
  const sunLon  = L0 + C;
  const omega   = 125.04 - 1934.136 * T;
  const apparent = sunLon - 0.00569 - 0.00478 * Math.sin(omega * D2R);
  const lon = norm360(apparent);
  return { name: 'sun', lon, ...lonToSign(lon) };
}

function computeMoon(jde) {
  const pos = moonposition.position(jde);
  const lon = norm360(pos.lon * R2D);
  return { name: 'moon', lon, ...lonToSign(lon) };
}

function computePlanet(name, jde) {
  const { Planet } = require(
    path.join(
      path.dirname(require.resolve('astronomia/package.json')),
      'lib', 'planetposition.cjs'
    )
  );
  const planet = new Planet(vsop[name]);
  const pos    = planet.position((jde - 2451545.0) / 365250);
  const lon    = norm360(pos.lon * R2D);
  return { name, lon, ...lonToSign(lon) };
}

function isRetrograde(name, jde) {
  if (name === 'sun' || name === 'moon') return false;
  const p1   = computePlanet(name, jde);
  const p2   = computePlanet(name, jde + 1);
  const diff = norm360(p2.lon - p1.lon);
  return diff > 180;
}

function computeNatalChart({ isoDate, timeStr, latDeg, lonDeg, tzOffsetH = 0 }) {
  const jde = toJDE(isoDate, timeStr, tzOffsetH);
  const sun  = computeSun(jde);
  const moon = computeMoon(jde);
  const outerPlanets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune']
    .map(name => computePlanet(name, jde));
  const hasTime = timeStr && timeStr !== '12:00';
  const angles  = (hasTime && latDeg != null)
    ? computeAngles(jde, latDeg, lonDeg)
    : null;
  const ascDeg = angles ? angles.ascDeg : 0;
  const houses = angles ? equalHouses(ascDeg) : null;
  const allPlanets = [sun, moon, ...outerPlanets].map(p => ({
    ...p,
    house:      houses ? getHouseNum(p.lon, ascDeg) : null,
    retrograde: isRetrograde(p.name, jde),
  }));
  return {
    planets:    allPlanets,
    ascendant:  angles ? angles.ascendant : null,
    midheaven:  angles ? angles.midheaven : null,
    houses,
    julianDay:  jde,
    houseSystem: 'equal',
    timeKnown:  !!hasTime,
  };
}

module.exports = { computeNatalChart, toJDE, SIGNS };

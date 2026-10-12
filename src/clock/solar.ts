import { getTimes, getPosition } from 'suncalc';

const RAD = Math.PI / 180;

export interface SubsolarPoint {
  lat: number;
  lng: number;
}

export interface SunEvents {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date | null;
  civilDawn: Date | null;
  civilDusk: Date | null;
}

function mod360(v: number): number {
  return ((v % 360) + 360) % 360;
}

function mod180(v: number): number {
  return ((((v + 180) % 360) + 360) % 360) - 180;
}

/**
 * Geographic point where the Sun is directly overhead (zenith).
 * Declination gives the latitude; the sub-solar longitude is derived from
 * Greenwich Mean Sidereal Time and the Sun's right ascension.
 */
export function subsolarPoint(date: Date): SubsolarPoint {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;

  const L = mod360(280.46 + 0.9856474 * n);
  const g = mod360(357.528 + 0.9856003 * n) * RAD;

  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;

  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda)) / RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / RAD;
  const gmst = mod360(280.46061837 + 360.98564736629 * n);

  return { lat: decl, lng: mod180(ra - gmst) };
}

/** Solar elevation above the horizon, in degrees, at a point. */
export function solarElevation(date: Date, lat: number, lng: number): number {
  return getPosition(date, lat, lng).altitude / RAD;
}

function valid(d: Date | undefined | null): Date | null {
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** Sunrise/sunset, civil twilight and meridian passage for a location. */
export function sunEvents(date: Date, lat: number, lng: number): SunEvents {
  const t = getTimes(date, lat, lng);
  return {
    sunrise: valid(t.sunrise),
    sunset: valid(t.sunset),
    solarNoon: valid(t.solarNoon),
    civilDawn: valid(t.dawn),
    civilDusk: valid(t.dusk)
  };
}

import tzlookup from 'tz-lookup';
import {
  ZONE_SCAN_LATITUDES,
  ZONE_SCAN_LNG_STEP,
  ZONE_MIN_LONGITUDES
} from '../config';

const RAD = Math.PI / 180;

export interface ZoneArrow {
  lng: number;
  offset: number;
  tz: string;
}

/** IANA zone name for a coordinate (falls back to a fixed offset zone). */
export function zoneAt(lat: number, lng: number): string {
  try {
    return tzlookup(lat, lng);
  } catch {
    return 'Etc/GMT';
  }
}

function offsetMinutes(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset'
  });
  const name = dtf.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] ?? '0', 10));
}

/** Standard (non-DST) UTC offset in hours — what the fixed Geochron belt uses. */
export function standardOffsetHours(tz: string): number {
  const jan = offsetMinutes(tz, new Date(Date.UTC(2023, 0, 15)));
  const jul = offsetMinutes(tz, new Date(Date.UTC(2023, 6, 15)));
  return Math.min(jan, jul) / 60;
}

/** Current offset in hours, including any DST in effect. */
export function currentOffsetHours(tz: string, date: Date): number {
  return offsetMinutes(tz, date) / 60;
}

/** Format an offset in hours as an "UTC+5:30" label. */
export function formatOffset(hours: number): string {
  const sign = hours < 0 ? '\u2212' : '+';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/**
 * One arrow per standard UTC offset. For each longitude the dominant standard
 * offset across all sampled latitudes is chosen; longitudes that share an offset
 * are then averaged with a circular mean, so arrows sit inside real legal time
 * zones rather than on uniform 15-degree meridians.
 */
export function buildZoneArrows(latitudes: number[] = ZONE_SCAN_LATITUDES): ZoneArrow[] {
  const offsets = new Map<number, { sx: number; sy: number; n: number; tz: string }>();

  for (let lng = -180; lng < 180; lng += ZONE_SCAN_LNG_STEP) {
    const counts = new Map<number, { n: number; tz: string }>();
    for (const lat of latitudes) {
      const tz = zoneAt(lat, lng);
      const off = standardOffsetHours(tz);
      const cur = counts.get(off);
      if (cur) cur.n += 1;
      else counts.set(off, { n: 1, tz });
    }
    let best = 0;
    let bestN = 0;
    let bestTz = '';
    for (const [off, info] of counts) {
      if (info.n > bestN) {
        bestN = info.n;
        best = off;
        bestTz = info.tz;
      }
    }
    const acc = offsets.get(best) ?? { sx: 0, sy: 0, n: 0, tz: bestTz };
    acc.sx += Math.cos(lng * RAD);
    acc.sy += Math.sin(lng * RAD);
    acc.n += 1;
    acc.tz = acc.tz || bestTz;
    offsets.set(best, acc);
  }

  const arrows: ZoneArrow[] = [];
  for (const [offset, acc] of offsets) {
    if (acc.n < ZONE_MIN_LONGITUDES) continue;
    const lng = Math.atan2(acc.sy, acc.sx) / RAD;
    arrows.push({ lng, offset, tz: acc.tz });
  }
  arrows.sort((a, b) => a.lng - b.lng);
  return arrows;
}

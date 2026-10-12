const RAD = Math.PI / 180;

export interface TerminatorGeometry {
  /** Closed polygon covering the night hemisphere (map user-space coords). */
  nightPath: string;
  /** The open terminator curve, for the twilight glow stroke. */
  twilightPath: string;
}

/**
 * Terminator in equirectangular space. Longitude maps linearly to x
 * (-180..180 -> 0..width); latitude maps linearly to y (90..-90 -> 0..height).
 * The map is always recentred on the sub-solar meridian, so the curve only
 * depends on the solar declination and stays fixed on screen while the imagery
 * scrolls beneath it.
 */
export function terminatorGeometry(dec: number, width: number, height: number): TerminatorGeometry {
  const t0 = Math.tan(dec * RAD);
  // Near the equinoxes tan(dec) -> 0; clamp so the terminator degenerates into
  // the correct pair of vertical edges instead of NaN.
  const t = Math.abs(t0) < 1e-6 ? (t0 >= 0 ? 1e-6 : -1e-6) : t0;
  const southDark = t > 0;

  const pts: string[] = [];
  for (let h = -180; h <= 180; h += 3) {
    const cosH = Math.cos(h * RAD);
    const lat = Math.atan(-cosH / t) / RAD;
    const x = ((h + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const curve = 'M ' + pts.join(' L ');
  const nightPath = southDark
    ? `${curve} L ${width} ${height} L 0 ${height} Z`
    : `${curve} L ${width} 0 L 0 0 Z`;
  return { nightPath, twilightPath: curve };
}

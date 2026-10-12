import { HOUR_BAND_HEIGHT, HOURS_PER_DAY } from '../config';

/**
 * The stationary 24-hour strip along the top. Noon (12) is always at the
 * horizontal centre, aligned with the sub-solar meridian at the middle of the
 * map. The moving arrows read their local hour against these fixed numbers.
 */
export function renderHourBand(svg: SVGSVGElement, width: number): void {
  const height = HOUR_BAND_HEIGHT;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const spacing = width / HOURS_PER_DAY;
  const parts: string[] = [];

  for (let h = 0; h < HOURS_PER_DAY; h++) {
    const x = h * spacing;
    const noon = h === 12;
    const stroke = noon ? '#ffb257' : '#78b4cc';
    parts.push(
      `<line x1="${x}" y1="${height - 17}" x2="${x}" y2="${height - 4}" stroke="${stroke}" stroke-width="${noon ? 2.4 : 1.4}"/>`
    );
    parts.push(
      `<text x="${x}" y="${height - 21}" text-anchor="middle" class="band-label${noon ? ' noon' : ''}">${h}</text>`
    );
  }

  parts.push(
    `<line x1="0" y1="${height - 3}" x2="${width}" y2="${height - 3}" stroke="#5c8ba0" stroke-width="1"/>`
  );
  svg.innerHTML = parts.join('');
}

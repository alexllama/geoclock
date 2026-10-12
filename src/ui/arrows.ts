import type { ClockMap } from '../map/map';
import type { ZoneArrow } from '../clock/timezones';
import { formatOffset } from '../clock/timezones';

/**
 * Moving time-zone arrows. Each sits at its zone's longitude and slides under
 * the stationary hour band as the map scrolls. The number it points to is the
 * zone's local hour.
 */
export function drawArrows(
  svg: SVGSVGElement,
  width: number,
  arrows: ZoneArrow[],
  clockMap: ClockMap
): void {
  const parts: string[] = [];
  for (const arrow of arrows) {
    const x = clockMap.projectX(arrow.lng);
    if (x < -40 || x > width + 40) continue;
    const label = formatOffset(arrow.offset);
    parts.push(
      `<g transform="translate(${x.toFixed(1)} 0)">` +
        '<polygon points="0,1 -6,13 6,13" class="arrow-tip"/>' +
        '<rect x="-26" y="13" width="52" height="17" rx="3" class="arrow-chip"/>' +
        `<text x="0" y="26" text-anchor="middle" class="arrow-text">${label}</text>` +
        '</g>'
    );
  }
  svg.innerHTML = parts.join('');
}

import { zoneAt, formatOffset, currentOffsetHours } from '../clock/timezones';
import { sunEvents, solarElevation } from '../clock/solar';

function clockTime(tz: string, date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function hhmm(date: Date | null, tz: string): string {
  if (!date) return '—';
  return clockTime(tz, date);
}

interface Unprojector {
  unproject(x: number, y: number): { lat: number; lng: number };
}

export interface HoverController {
  setEnabled(enabled: boolean): void;
}

/** Hover readout: local time, offset, sunrise/sunset and solar noon. */
export function setupHover(
  container: Element,
  world: Unprojector,
  tooltip: HTMLElement
): HoverController {
  let raf = 0;
  let enabled = true;
  let last: { x: number; y: number; lat: number; lng: number } | null = null;

  function render(): void {
    raf = 0;
    if (!last) return;
    const now = new Date();
    const { lat, lng } = last;
    const tz = zoneAt(lat, lng);
    const offset = currentOffsetHours(tz, now);
    const elev = solarElevation(now, lat, lng);
    const events = sunEvents(now, lat, lng);
    const isDay = elev > 0;

    tooltip.innerHTML =
      `<div class="tt-title">${tz.replace(/_/g, ' ')}</div>` +
      `<div class="tt-time">${clockTime(tz, now)} <span class="tt-off">${formatOffset(offset)}</span></div>` +
      `<div class="tt-row"><span class="tt-dot ${isDay ? 'day' : 'night'}"></span>${isDay ? 'Daylight' : 'Night'} · Sun ${elev.toFixed(0)}°</div>` +
      `<div class="tt-row">Sunrise ${hhmm(events.sunrise, tz)} · Sunset ${hhmm(events.sunset, tz)}</div>` +
      `<div class="tt-row">Solar noon ${hhmm(events.solarNoon, tz)}</div>` +
      `<div class="tt-coord">${lat.toFixed(1)}°, ${lng.toFixed(1)}°</div>`;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let left = last.x + 16;
    let top = last.y + 16;
    if (left + tw > w - 6) left = last.x - tw - 16;
    if (top + th > h - 6) top = last.y - th - 16;
    tooltip.style.left = `${Math.max(6, left)}px`;
    tooltip.style.top = `${Math.max(6, top)}px`;
    tooltip.style.opacity = '1';
  }

  container.addEventListener('mousemove', (event) => {
    if (!enabled) return;
    const e = event as MouseEvent;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = world.unproject(x, y);
    last = { x, y, lat: point.lat, lng: point.lng };
    if (!raf) raf = requestAnimationFrame(render);
  });

  container.addEventListener('mouseleave', () => {
    last = null;
    tooltip.style.opacity = '0';
  });

  return {
    setEnabled(next: boolean): void {
      enabled = next;
      if (!enabled) {
        last = null;
        tooltip.style.opacity = '0';
      }
    }
  };
}

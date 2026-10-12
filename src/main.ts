import './styles.css';
import { subsolarPoint, type SubsolarPoint } from './clock/solar';
import { buildZoneArrows } from './clock/timezones';
import { createClockMap, type ClockMap } from './map/map';
import { renderHourBand } from './ui/hourband';
import { drawArrows } from './ui/arrows';
import { createDial } from './ui/dial';
import { Readouts } from './ui/readouts';
import { setupHover } from './ui/hover';

const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function el<T extends Element>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error('missing #' + id);
  return node as unknown as T;
}

async function boot(): Promise<void> {
  const mapEl = el<HTMLDivElement>('map');
  const bandSvg = el<SVGSVGElement>('band-svg');
  const overlaySvg = el<SVGSVGElement>('overlay');
  const dialSvg = el<SVGSVGElement>('dial');
  const tooltip = el<HTMLDivElement>('hover');
  const errEl = el<HTMLDivElement>('err');

  let sun: SubsolarPoint = subsolarPoint(new Date());

  let clockMap: ClockMap;
  try {
    clockMap = await createClockMap(mapEl, import.meta.env.BASE_URL, sun);
  } catch (error) {
    console.error(error);
    errEl.hidden = false;
    errEl.textContent = 'Could not load the world map: ' + (error as Error).message;
    return;
  }

  const arrows = buildZoneArrows();
  const readouts = new Readouts(viewerTz);
  const dial = createDial(dialSvg);
  setupHover(mapEl, clockMap.map, tooltip);

  function layout(): void {
    const width = clockMap.width();
    renderHourBand(bandSvg, width);
    overlaySvg.setAttribute('viewBox', `0 0 ${width} ${clockMap.height()}`);
    drawArrows(overlaySvg, width, arrows, clockMap);
  }

  clockMap.onResize(layout);
  layout();
  readouts.update(new Date());

  let lastSecond = -1;
  function frame(): void {
    const now = new Date();
    dial.update(now, viewerTz);

    const second = Math.floor(now.getTime() / 1000);
    if (second !== lastSecond) {
      lastSecond = second;
      sun = subsolarPoint(now);
      clockMap.setSun(sun);
      clockMap.setCenterLng(sun.lng);
      readouts.update(now);
      drawArrows(overlaySvg, clockMap.width(), arrows, clockMap);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  el<HTMLButtonElement>('fs').addEventListener('click', () => {
    const app = el<HTMLDivElement>('app');
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      app.requestFullscreen?.().catch(() => undefined);
    }
  });
}

void boot();

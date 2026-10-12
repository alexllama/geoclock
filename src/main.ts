import './styles.css';
import { subsolarPoint, type SubsolarPoint } from './clock/solar';
import { buildZoneArrows } from './clock/timezones';
import { createWorld, type World, type BaseMapId } from './world';
import { renderHourBand } from './ui/hourband';
import { drawArrows } from './ui/arrows';
import { Readouts } from './ui/readouts';
import { setupHover } from './ui/hover';

const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function el<T extends Element>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error('missing #' + id);
  return node as unknown as T;
}

async function boot(): Promise<void> {
  const worldEl = el<HTMLDivElement>('world');
  const mapSvg = el<SVGSVGElement>('map-svg');
  const bandSvg = el<SVGSVGElement>('band-svg');
  const overlaySvg = el<SVGSVGElement>('overlay');
  const tooltip = el<HTMLDivElement>('hover');
  const errEl = el<HTMLDivElement>('err');

  let sun: SubsolarPoint = subsolarPoint(new Date());

  let world: World;
  try {
    world = await createWorld(mapSvg, import.meta.env.BASE_URL, sun);
  } catch (error) {
    console.error(error);
    errEl.hidden = false;
    errEl.textContent = 'Could not load the world map: ' + (error as Error).message;
    return;
  }

  const arrows = buildZoneArrows();
  const readouts = new Readouts(viewerTz);
  setupHover(worldEl, world, tooltip);

  const basemapToggle = el<HTMLButtonElement>('basemap-toggle');
  const basemapLabel = el<HTMLElement>('basemap-label');
  let satellite = true;
  function applyBaseMap(): void {
    const id: BaseMapId = satellite ? 'satellite' : 'boundaries';
    world.setBaseMap(id);
    basemapLabel.textContent = satellite ? 'Satellite' : 'Country boundaries';
    basemapToggle.setAttribute('aria-pressed', String(satellite));
  }
  basemapToggle.addEventListener('click', () => {
    satellite = !satellite;
    applyBaseMap();
  });
  applyBaseMap();

  function layout(): void {
    const width = world.width();
    renderHourBand(bandSvg, width);
    overlaySvg.setAttribute('viewBox', `0 0 ${width} ${world.height()}`);
    drawArrows(overlaySvg, width, arrows, (lng) => world.projectX(lng));
  }

  world.onResize(layout);
  layout();
  readouts.update(new Date());

  let lastSecond = -1;
  function frame(): void {
    const now = new Date();
    const second = Math.floor(now.getTime() / 1000);
    if (second !== lastSecond) {
      lastSecond = second;
      sun = subsolarPoint(now);
      world.setSun(sun);
      readouts.update(now);
      drawArrows(overlaySvg, world.width(), arrows, (lng) => world.projectX(lng));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

void boot();

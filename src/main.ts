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
  const hover = setupHover(mapSvg, world, tooltip);
  const tooltipToggle = el<HTMLButtonElement>('tooltip-toggle');
  let tooltipOn = false;
  function applyTooltip(): void {
    hover.setEnabled(tooltipOn);
    tooltipToggle.setAttribute('aria-pressed', String(tooltipOn));
  }
  tooltipToggle.addEventListener('click', () => {
    tooltipOn = !tooltipOn;
    applyTooltip();
  });
  applyTooltip();

  const basemapToggle = el<HTMLButtonElement>('basemap-toggle');
  let satellite = true;
  function applyBaseMap(): void {
    const id: BaseMapId = satellite ? 'satellite' : 'boundaries';
    world.setBaseMap(id);
    basemapToggle.setAttribute('aria-pressed', String(satellite));
    basemapToggle.setAttribute(
      'aria-label',
      satellite ? 'Base map: satellite imagery (click for country boundaries)' : 'Base map: country boundaries (click for satellite imagery)'
    );
  }
  basemapToggle.addEventListener('click', () => {
    satellite = !satellite;
    applyBaseMap();
  });
  applyBaseMap();

  const infoBtn = el<HTMLButtonElement>('info-btn');
  const infoPop = el<HTMLDivElement>('info-pop');
  const infoWrap = infoBtn.parentElement ?? infoBtn;
  let infoPinned = false;
  function setInfo(open: boolean): void {
    infoPop.hidden = !open;
    infoBtn.setAttribute('aria-expanded', String(open));
  }
  infoWrap.addEventListener('mouseenter', () => setInfo(true));
  infoWrap.addEventListener('mouseleave', () => {
    if (!infoPinned) setInfo(false);
  });
  infoBtn.addEventListener('click', () => {
    infoPinned = !infoPinned;
    setInfo(infoPinned);
  });
  document.addEventListener('click', (event) => {
    if (infoPinned && !infoWrap.contains(event.target as Node)) {
      infoPinned = false;
      setInfo(false);
    }
  });

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

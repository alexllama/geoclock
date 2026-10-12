import { terminatorGeometry } from './clock/terminator';

export type BaseMapId = 'satellite' | 'boundaries';

export interface SubsolarPoint {
  lat: number;
  lng: number;
}

export interface World {
  setSun(sun: SubsolarPoint): void;
  setBaseMap(id: BaseMapId): void;
  /** Longitude -> x offset in CSS pixels within the map element. */
  projectX(lng: number): number;
  unproject(x: number, y: number): { lat: number; lng: number };
  width(): number;
  height(): number;
  onResize(cb: () => void): void;
}

const W = 2048;
const H = 1024;
const SVG_NS = 'http://www.w3.org/2000/svg';

const PALETTE = [
  '#ffd21f', '#ff9f1c', '#ff6b6b', '#f25c9e', '#b06bff', '#5b8dff',
  '#2fb8e6', '#22d3b7', '#3ddc6b', '#a3e635', '#f59e0b', '#fb7185',
];

interface GeoGeometry {
  type: string;
  coordinates: unknown;
}
interface GeoFeature {
  properties: Record<string, unknown>;
  geometry: GeoGeometry;
}
interface GeoData {
  features: GeoFeature[];
}

function svgEl(name: string): SVGElement {
  return document.createElementNS(SVG_NS, name) as SVGElement;
}

function attr(el: Element, attrs: Record<string, string>): void {
  for (const key in attrs) el.setAttribute(key, attrs[key]);
}

function hashCode(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function equiX(lng: number): number {
  return ((lng + 180) / 360) * W;
}

function equiY(lat: number): number {
  return ((90 - lat) / 180) * H;
}

function ringPath(ring: number[][]): string {
  let d = '';
  for (let i = 0; i < ring.length; i++) {
    const point = ring[i];
    d += (i ? 'L' : 'M') + equiX(point[0]).toFixed(1) + ' ' + equiY(point[1]).toFixed(1) + ' ';
  }
  return d + 'Z ';
}

function featurePath(geometry: GeoGeometry): string {
  let d = '';
  const polys =
    geometry.type === 'Polygon'
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][]);
  for (const poly of polys) for (const ring of poly) d += ringPath(ring);
  return d;
}

function setImageHref(image: SVGElement, href: string): void {
  image.setAttribute('href', href);
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
}

export async function createWorld(
  svg: SVGSVGElement,
  baseUrl: string,
  initial: SubsolarPoint,
): Promise<World> {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  const defs = svgEl('defs');

  const feather = svgEl('filter');
  attr(feather, { id: 'termFeather', x: '-15%', y: '-15%', width: '130%', height: '130%' });
  const featherBlur = svgEl('feGaussianBlur');
  featherBlur.setAttribute('stdDeviation', '14');
  feather.appendChild(featherBlur);

  const glow = svgEl('filter');
  attr(glow, { id: 'twilightBlur', x: '-15%', y: '-15%', width: '130%', height: '130%' });
  const glowBlur = svgEl('feGaussianBlur');
  glowBlur.setAttribute('stdDeviation', '6');
  glow.appendChild(glowBlur);

  const mask = svgEl('mask');
  attr(mask, {
    id: 'nightMask',
    maskUnits: 'userSpaceOnUse',
    maskContentUnits: 'userSpaceOnUse',
    x: '0',
    y: '0',
    width: String(W),
    height: String(H),
  });
  const maskBase = svgEl('rect');
  attr(maskBase, { x: '0', y: '0', width: String(W), height: String(H), fill: '#000' });
  const nightMaskPath = svgEl('path');
  attr(nightMaskPath, { fill: '#fff', filter: 'url(#termFeather)' });
  mask.append(maskBase, nightMaskPath);

  defs.append(feather, glow, mask);

  let countries: GeoData = { features: [] };
  try {
    const response = await fetch(baseUrl + 'data/ne_110m_admin_0_countries.geojson');
    if (response.ok) countries = (await response.json()) as GeoData;
  } catch {
    countries = { features: [] };
  }

  const flat = svgEl('g');
  const flatDef = svgEl('g');
  flatDef.setAttribute('id', 'flat-def');
  flatDef.appendChild(flat);

  const ocean = svgEl('rect');
  attr(ocean, { x: '0', y: '0', width: String(W), height: String(H), fill: '#0b2230' });
  flat.appendChild(ocean);

  const byColor = new Map<string, string>();
  let borderD = '';
  for (const feature of countries.features) {
    const name = String(feature.properties.ADMIN ?? '');
    const color = PALETTE[hashCode(name) % PALETTE.length];
    const d = featurePath(feature.geometry);
    byColor.set(color, (byColor.get(color) ?? '') + d);
    borderD += d;
  }
  for (const [color, d] of byColor) {
    const path = svgEl('path');
    attr(path, { d, fill: color, 'fill-rule': 'evenodd', stroke: 'none' });
    flat.appendChild(path);
  }
  const borders = svgEl('path');
  attr(borders, { d: borderD, fill: 'none', stroke: 'rgba(24,42,56,0.9)', 'stroke-width': '1.2' });
  flat.appendChild(borders);

  const dayDef = svgEl('g');
  dayDef.setAttribute('id', 'day-def');
  const dayImage = svgEl('image');
  attr(dayImage, {
    x: '0',
    y: '0',
    width: String(W),
    height: String(H),
    preserveAspectRatio: 'none',
    class: 'day-image',
  });
  setImageHref(dayImage, baseUrl + 'data/day-marble.jpg');
  dayDef.appendChild(dayImage);

  const nightDef = svgEl('g');
  nightDef.setAttribute('id', 'night-def');
  const nightImage = svgEl('image');
  attr(nightImage, {
    x: '0',
    y: '0',
    width: String(W),
    height: String(H),
    preserveAspectRatio: 'none',
    class: 'night-image',
  });
  setImageHref(nightImage, baseUrl + 'data/night-lights.jpg');
  nightDef.appendChild(nightImage);

  defs.append(flatDef, dayDef, nightDef);
  svg.appendChild(defs);

  const scroll = svgEl('g');
  scroll.setAttribute('id', 'scroll');
  const dayCopies = svgEl('g');
  dayCopies.setAttribute('id', 'day-copies');
  const flatCopies = svgEl('g');
  flatCopies.setAttribute('id', 'flat-copies');
  for (const dx of [-W, 0, W]) {
    const dayUse = svgEl('use');
    dayUse.setAttribute('href', '#day-def');
    dayUse.setAttribute('x', String(dx));
    dayCopies.appendChild(dayUse);
    const flatUse = svgEl('use');
    flatUse.setAttribute('href', '#flat-def');
    flatUse.setAttribute('x', String(dx));
    flatCopies.appendChild(flatUse);
  }
  scroll.append(dayCopies, flatCopies);

  const nightMasked = svgEl('g');
  nightMasked.setAttribute('mask', 'url(#nightMask)');
  const veil = svgEl('rect');
  attr(veil, { x: '0', y: '0', width: String(W), height: String(H), fill: '#040a16', opacity: '0.74' });
  const nightScroll = svgEl('g');
  nightScroll.setAttribute('id', 'night-scroll');
  for (const dx of [-W, 0, W]) {
    const use = svgEl('use');
    use.setAttribute('href', '#night-def');
    use.setAttribute('x', String(dx));
    nightScroll.appendChild(use);
  }
  nightMasked.append(veil, nightScroll);

  const twilight = svgEl('path');
  attr(twilight, {
    fill: 'none',
    stroke: '#ffab5e',
    'stroke-width': '10',
    'stroke-linecap': 'round',
    filter: 'url(#twilightBlur)',
    opacity: '0.55',
    class: 'twilight',
  });

  svg.append(scroll, nightMasked, twilight);

  let tx = 0;

  function setBaseMap(id: BaseMapId): void {
    const satellite = id === 'satellite';
    (dayCopies as unknown as HTMLElement).style.display = satellite ? '' : 'none';
    (flatCopies as unknown as HTMLElement).style.display = satellite ? 'none' : '';
    (nightScroll as unknown as HTMLElement).style.display = satellite ? '' : 'none';
  }

  function setSun(sun: SubsolarPoint): void {
    tx = W / 2 - equiX(sun.lng);
    const transform = `translate(${tx.toFixed(2)} 0)`;
    scroll.setAttribute('transform', transform);
    nightScroll.setAttribute('transform', transform);
    const geometry = terminatorGeometry(sun.lat, W, H);
    nightMaskPath.setAttribute('d', geometry.nightPath);
    twilight.setAttribute('d', geometry.twilightPath);
  }

  const resizeCallbacks: Array<() => void> = [];
  const observer = new ResizeObserver(() => {
    for (const cb of resizeCallbacks) cb();
  });
  observer.observe(svg);

  setBaseMap('satellite');
  setSun(initial);

  return {
    setSun,
    setBaseMap,
    projectX(lng: number): number {
      let x = equiX(lng) + tx;
      x = ((x % W) + W) % W;
      const px = svg.clientWidth || W;
      return (x / W) * px;
    },
    unproject(x: number, y: number): { lat: number; lng: number } {
      const px = svg.clientWidth || W;
      const py = svg.clientHeight || H;
      const logicalX = (x / px) * W - tx;
      let lng = (logicalX / W) * 360 - 180;
      lng = (((lng + 180) % 360) + 360) % 360 - 180;
      const lat = 90 - (y / py) * 180;
      return { lat, lng };
    },
    width(): number {
      return svg.clientWidth || W;
    },
    height(): number {
      return svg.clientHeight || H;
    },
    onResize(cb: () => void): void {
      resizeCallbacks.push(cb);
    },
  };
}

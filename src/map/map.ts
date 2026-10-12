import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { TerminatorLayer } from '../layers/terminator';
import { applyRegisteredLayers } from '../layers/registry';
import type { SubsolarPoint } from '../clock/solar';

const TILE_SIZE = 512;

// Muted political-cartography palette, picked per country by name hash.
const PALETTE = [
  '#d9c9a3', '#c9b3d9', '#a3c9d9', '#c9d9a3', '#d9a3a3', '#a3d9b5',
  '#d9c3a3', '#b5a3d9', '#a3b8d9', '#d9d9a3', '#a3d9d0', '#d9a3c9'
];

function hashCode(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function colorFor(name: string): string {
  return PALETTE[hashCode(name) % PALETTE.length];
}

function graticule(): unknown {
  const features: unknown[] = [];
  for (let lng = -180; lng <= 180; lng += 30) {
    const coordinates: number[][] = [];
    for (let lat = -80; lat <= 80; lat += 4) coordinates.push([lng, lat]);
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const coordinates: number[][] = [];
    for (let lng = -180; lng <= 180; lng += 4) coordinates.push([lng, lat]);
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
  }
  return { type: 'FeatureCollection', features };
}

function zoomForWidth(width: number): number {
  return Math.log2(Math.max(width, 1) / TILE_SIZE);
}

export interface ClockMap {
  map: maplibregl.Map;
  setSun(point: SubsolarPoint): void;
  setCenterLng(lng: number): void;
  projectX(lng: number): number;
  width(): number;
  height(): number;
  onResize(cb: () => void): void;
}

export async function createClockMap(
  container: HTMLElement,
  baseUrl: string,
  initial: SubsolarPoint
): Promise<ClockMap> {
  maplibregl.setWorkerUrl(workerUrl);

  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      name: 'geoclock',
      sources: {},
      layers: [
        { id: 'ocean', type: 'background', paint: { 'background-color': '#0b2230' } }
      ]
    },
    center: [initial.lng, 0],
    zoom: zoomForWidth(container.clientWidth),
    interactive: false,
    attributionControl: false,
    renderWorldCopies: true,
    fadeDuration: 0,
    minZoom: 0,
    maxZoom: 4
  });

  const terminator = new TerminatorLayer();
  terminator.setSun(initial.lng, initial.lat);

  await new Promise<void>((resolve) => map.on('load', () => resolve()));

  const res = await fetch(`${baseUrl}data/ne_110m_admin_0_countries.geojson`);
  if (!res.ok) throw new Error(`countries dataset: HTTP ${res.status}`);
  const geo = (await res.json()) as {
    features: { properties: Record<string, unknown> }[];
  };
  for (const feature of geo.features) {
    const name = String(feature.properties.ADMIN ?? '');
    feature.properties = { name, color: colorFor(name) };
  }

  map.addSource('countries', { type: 'geojson', data: geo as never });
  map.addSource('graticule', { type: 'geojson', data: graticule() as never });

  map.addLayer({
    id: 'land',
    type: 'fill',
    source: 'countries',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.92 }
  });
  map.addLayer(terminator);
  map.addLayer({
    id: 'graticule',
    type: 'line',
    source: 'graticule',
    paint: { 'line-color': 'rgba(255,255,255,0.10)', 'line-width': 0.6 }
  });
  map.addLayer({
    id: 'borders',
    type: 'line',
    source: 'countries',
    paint: { 'line-color': 'rgba(24,48,60,0.85)', 'line-width': 0.7 }
  });

  applyRegisteredLayers({ map, baseUrl });

  const resizeCallbacks: (() => void)[] = [];
  const observer = new ResizeObserver(() => {
    map.resize();
    map.jumpTo({ zoom: zoomForWidth(container.clientWidth), center: map.getCenter() });
    for (const cb of resizeCallbacks) cb();
  });
  observer.observe(container);

  return {
    map,
    setSun(point) {
      terminator.setSun(point.lng, point.lat);
    },
    setCenterLng(lng) {
      map.jumpTo({ center: [lng, 0] });
    },
    projectX(lng) {
      const w = container.clientWidth;
      const x = map.project([lng, 0]).x;
      return ((x % w) + w) % w;
    },
    width() {
      return container.clientWidth;
    },
    height() {
      return container.clientHeight;
    },
    onResize(cb) {
      resizeCallbacks.push(cb);
    }
  };
}

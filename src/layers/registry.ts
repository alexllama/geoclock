import type * as maplibregl from 'maplibre-gl';

export interface LayerContext {
  map: maplibregl.Map;
  baseUrl: string;
}

export type LayerFactory = (ctx: LayerContext) => void;

const registry: LayerFactory[] = [];

/**
 * Extension point for future overlays — weather raster tiles, satellite
 * tracking markers, aviation, etc. A layer adds its own sources/layers to the
 * map and can subscribe to the clock tick via the returned context.
 */
export function registerLayer(factory: LayerFactory): void {
  registry.push(factory);
}

export function applyRegisteredLayers(ctx: LayerContext): void {
  for (const factory of registry) factory(ctx);
}

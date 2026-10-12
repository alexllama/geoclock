export const HOURS_PER_DAY = 24;

// Dense latitudes sampled when deriving legal time-zone arrows from tz-lookup.
// The dominant standard offset at each longitude wins; those longitudes are then
// averaged (circularly) into one arrow per UTC offset.
export const ZONE_SCAN_LATITUDES = Array.from({ length: 33 }, (_, i) => 80 - i * 5);
export const ZONE_SCAN_LNG_STEP = 1;
export const ZONE_MIN_LONGITUDES = 6;

// Cosmetic.
export const HOUR_BAND_HEIGHT = 42;

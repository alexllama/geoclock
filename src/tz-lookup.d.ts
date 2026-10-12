declare module 'tz-lookup' {
  /** Returns the IANA time-zone name for a latitude/longitude, e.g. "Europe/Paris". */
  export default function tzlookup(latitude: number, longitude: number): string;
}

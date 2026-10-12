function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error('missing #' + id);
  return node;
}

function fmt(tz: string, options: Intl.DateTimeFormatOptions, date: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...options }).format(date);
}

export class Readouts {
  private month = el('date-month');
  private day = el('date-day');
  private weekday = el('date-weekday');
  private year = el('date-year');
  private localTime = el('local-time');
  private localZone = el('local-zone');
  private utcTime = el('utc-time');

  constructor(private viewerTz: string) {
    this.localZone.textContent = viewerTz.replace(/_/g, ' ');
  }

  update(now: Date): void {
    this.month.textContent = fmt(this.viewerTz, { month: 'long' }, now);
    this.day.textContent = fmt(this.viewerTz, { day: 'numeric' }, now);
    this.weekday.textContent = fmt(this.viewerTz, { weekday: 'long' }, now);
    this.year.textContent = fmt(this.viewerTz, { year: 'numeric' }, now);
    this.localTime.textContent = fmt(
      this.viewerTz,
      { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false },
      now
    );
    this.utcTime.textContent = fmt(
      'UTC',
      { hour: '2-digit', minute: '2-digit', hour12: false },
      now
    );
  }
}

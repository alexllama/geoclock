function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error('missing #' + id);
  return node;
}

function fmt(tz: string, options: Intl.DateTimeFormatOptions, date: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...options }).format(date);
}

export class Readouts {
  private date = el('date');
  private localTime = el('local-time');
  private localZone = el('local-zone');
  private utcTime = el('utc-time');

  constructor(private viewerTz: string) {
    this.localZone.textContent = viewerTz.replace(/_/g, ' ');
  }

  update(now: Date): void {
    this.date.textContent = fmt(
      this.viewerTz,
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
      now
    );
    this.localTime.textContent = fmt(
      this.viewerTz,
      { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true },
      now
    );
    this.utcTime.textContent = fmt(
      'UTC',
      { hour: '2-digit', minute: '2-digit', hour12: false },
      now
    );
  }
}

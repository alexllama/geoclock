export interface Dial {
  update(now: Date, tz: string): void;
}

const SIZE = 84;
const C = SIZE / 2;
const R = C - 4;

/** Small analogue minutes/seconds dial in the corner, as on the original. */
export function createDial(svg: SVGSVGElement): Dial {
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  const parts: string[] = [`<circle cx="${C}" cy="${C}" r="${R}" class="dial-face"/>`];

  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const inner = major ? R - 7 : R - 4;
    const x1 = C + Math.cos(angle) * inner;
    const y1 = C + Math.sin(angle) * inner;
    const x2 = C + Math.cos(angle) * (R - 1);
    const y2 = C + Math.sin(angle) * (R - 1);
    parts.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="dial-tick${major ? ' major' : ''}"/>`
    );
  }

  parts.push(
    `<g id="dial-minute"><line x1="${C}" y1="${C}" x2="${C}" y2="${C - R + 9}" class="dial-hand-minute"/></g>`,
    `<g id="dial-second"><line x1="${C}" y1="${C}" x2="${C}" y2="${C - R + 5}" class="dial-hand-second"/></g>`,
    `<circle cx="${C}" cy="${C}" r="2.6" class="dial-cap"/>`
  );
  svg.innerHTML = parts.join('');

  const minuteHand = svg.querySelector('#dial-minute') as SVGGElement;
  const secondHand = svg.querySelector('#dial-second') as SVGGElement;

  return {
    update(now, tz) {
      const partsNow = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(now);
      const read = (type: string): number => {
        const part = partsNow.find((p) => p.type === type);
        return part ? parseInt(part.value, 10) : 0;
      };
      const minute = read('minute');
      const second = read('second');
      minuteHand.setAttribute(
        'transform',
        `rotate(${(((minute + second / 60) / 60) * 360).toFixed(2)} ${C} ${C})`
      );
      secondHand.setAttribute('transform', `rotate(${((second / 60) * 360).toFixed(2)} ${C} ${C})`);
    }
  };
}

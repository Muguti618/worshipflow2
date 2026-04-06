/** Local-time dashboard copy: time of day, Sunday, Christmas season, New Year. */

export type DashboardGreeting = {
  /** Main gradient headline */
  title: string;
  /** Line under the title */
  subtitle: string;
  /** Exact local time + weekday date, e.g. "Right now it's 7:24 PM — Tuesday, 4 December 2026." */
  detailLine: string;
};

function christmasSeason(d: Date): boolean {
  const m = d.getMonth();
  const day = d.getDate();
  return (m === 11 && day >= 1) || (m === 0 && day <= 6);
}

function christmasPeak(d: Date): boolean {
  const m = d.getMonth();
  const day = d.getDate();
  return m === 11 && day >= 24 && day <= 26;
}

function newYearsDay(d: Date): boolean {
  return d.getMonth() === 0 && d.getDate() === 1;
}

function timeOfDayPhrase(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

export function getDashboardGreeting(now: Date = new Date()): DashboardGreeting {
  const hour = now.getHours();
  const dow = now.getDay();
  const tod = timeOfDayPhrase(hour);

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const detailLine = `Right now it's ${timeStr} — ${dateStr}.`;

  const isSun = dow === 0;
  const xmas = christmasSeason(now);
  const xmasPeak = christmasPeak(now);
  const nyd = newYearsDay(now);

  if (isSun) {
    let title = "Happy Sunday";
    if (xmasPeak) title = "Happy Sunday — Merry Christmas!";
    else if (xmas) title = "Happy Sunday — Merry Christmas";
    return {
      title,
      subtitle: "Let's worship Him together.",
      detailLine,
    };
  }

  if (nyd) {
    return {
      title: `${tod} — Happy New Year!`,
      subtitle: "A fresh start — may God bless your worship and your people today.",
      detailLine,
    };
  }

  if (xmasPeak) {
    return {
      title: `${tod} — Merry Christmas!`,
      subtitle: "Celebrating the birth of our Saviour — bless your gathering today.",
      detailLine,
    };
  }

  if (xmas) {
    return {
      title: `${tod} — Merry Christmas`,
      subtitle: "Christmas season — may your services glorify Him.",
      detailLine,
    };
  }

  return {
    title: tod,
    subtitle:
      "Choose a setlist below — your deck is every slide, in order. Present and Audience stay in sync.",
    detailLine,
  };
}

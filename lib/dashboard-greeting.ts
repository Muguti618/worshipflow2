/** Local-time dashboard copy: time of day, Sunday, Christmas season, New Year. */

export type DashboardGreeting = {
  /** Main gradient headline */
  title: string;
  /** Line under the title */
  subtitle: string;
};

function firstName(displayName: string | undefined): string | null {
  if (!displayName?.trim()) return null;
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? null;
}

/** Emoji paired with dashboard greeting (sidebar + hero). */
export function greetingEmojiForDate(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "🌤️";
  if (hour >= 12 && hour < 17) return "☀️";
  if (hour >= 17 && hour < 22) return "🌆";
  return "🌙";
}

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

function commaName(displayName: string | undefined): string {
  const fn = firstName(displayName);
  return fn ? `, ${fn}` : "";
}

export function getDashboardGreeting(
  now: Date = new Date(),
  opts?: { displayName?: string },
): DashboardGreeting {
  const hour = now.getHours();
  const dow = now.getDay();
  const tod = timeOfDayPhrase(hour);
  const emoji = greetingEmojiForDate(now);
  const dn = opts?.displayName;
  const cn = commaName(dn);

  const isSun = dow === 0;
  const xmas = christmasSeason(now);
  const xmasPeak = christmasPeak(now);
  const nyd = newYearsDay(now);

  if (isSun) {
    let title: string;
    if (xmasPeak) title = `Happy Sunday${cn} — Merry Christmas! 🎄`;
    else if (xmas) title = `Happy Sunday${cn} — Merry Christmas 🎄`;
    else title = `Happy Sunday${cn} 🙏`;
    return {
      title,
      subtitle: "Let's worship Him together.",
    };
  }

  if (nyd) {
    return {
      title: `${tod}${cn} — Happy New Year! 🎉`,
      subtitle: "A fresh start — may God bless your worship and your people today.",
    };
  }

  if (xmasPeak) {
    return {
      title: `${tod}${cn} — Merry Christmas! 🎄`,
      subtitle: "Celebrating the birth of our Saviour — bless your gathering today.",
    };
  }

  if (xmas) {
    return {
      title: `${tod}${cn} — Merry Christmas 🎄`,
      subtitle: "Christmas season — may your services glorify Him.",
    };
  }

  return {
    title: `${tod}${cn} ${emoji}`,
    subtitle:
      "Choose a setlist below — your deck is every slide, in order. Present and Audience stay in sync.",
  };
}

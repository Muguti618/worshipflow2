/**
 * Shared dummy responses for demos and tests (no external API).
 * Replace with real model calls in production.
 */

import { BACKGROUND_PRESETS } from "@/lib/background-presets";
import type { SlideTypography } from "@/lib/setlists-catalog";
import { lyricsToSlideCards } from "@/lib/slide-engine";

export const AI_DUMMY_META = {
  mode: "dummy-test-data" as const,
  modelLabel: "worshipflow2 Preview v0 (stub)",
  latencyMsSimulated: 380,
};

export function getDummyBridgeResponse(prompt: string): {
  lines: string[];
  slideSuggestions: { title: string; lines: string[] }[];
  note: string;
  echo: string;
} {
  const p = prompt.trim().toLowerCase();
  const echo = prompt.trim().slice(0, 160);

  if (/peace|calm|still|quiet|rest/.test(p)) {
    return {
      lines: [
        "Your peace, it anchors every storm inside",
        "Stillness where my soul can breathe again",
        "Jesus, I will rest in You alone",
        "You are faithful when the night is long",
      ],
      slideSuggestions: [
        { title: "Bridge · Peace", lines: ["Your peace, it anchors every storm inside", "Stillness where my soul can breathe again"] },
        { title: "Bridge · Trust", lines: ["Jesus, I will rest in You alone", "You are faithful when the night is long"] },
      ],
      note: `${AI_DUMMY_META.modelLabel} — themed “peace” (test data). Each block can become its own slide in Songs or Slide Studio.`,
      echo,
    };
  }

  if (/hope|rise|dawn|morning|light/.test(p)) {
    return {
      lines: [
        "Light breaks the horizon of my heart",
        "Hope that rises with the morning sun",
        "Christ, my dawn when shadows fall",
        "Every promise You have spoken stands",
      ],
      slideSuggestions: [
        { title: "Bridge · Hope", lines: ["Light breaks the horizon of my heart", "Hope that rises with the morning sun"] },
        { title: "Bridge · Christ", lines: ["Christ, my dawn when shadows fall", "Every promise You have spoken stands"] },
      ],
      note: `${AI_DUMMY_META.modelLabel} — themed “hope” (test data). Save as multiple slides per song.`,
      echo,
    };
  }

  return {
    lines: [
      "We lift Your name above every throne",
      "Heaven and earth will bow before You",
      "Holy, holy, is the Lord Almighty",
      "Worthy of all our praise forever",
    ],
    slideSuggestions: [
      { title: "Bridge · Praise A", lines: ["We lift Your name above every throne", "Heaven and earth will bow before You"] },
      { title: "Bridge · Praise B", lines: ["Holy, holy, is the Lord Almighty", "Worthy of all our praise forever"] },
    ],
    note: `${AI_DUMMY_META.modelLabel} — default worship bridge (test data). One song → many slides in presenter.`,
    echo,
  };
}

export function getDummyAiChatReply(userMessage: string): { text: string; tag: string } {
  const q = userMessage.trim().toLowerCase();

  if (/verse|bible|scripture|passage/.test(q)) {
    return {
      tag: "bible",
      text: `Here are some **passages to explore**:\n\n• Philippians 4:6–7 — peace instead of anxiety\n• Romans 15:13 — God fills you with hope\n• Psalm 46:1 — God our refuge and strength\n\nOpen **Bible** for full text and formatting. In **Setlists**, tap **+ Scripture** to turn a reference or topic into slides you can review before adding.`,
    };
  }

  if (/slide|line|readab|format|split|break/.test(q)) {
    return {
      tag: "slides",
      text: `**One song, many slides:** each **song** can have several **slides** (verse, chorus, bridge, etc.).\n\n• **Songs** — edit each slide’s title and lines; use the arrows to reorder.\n• **Slide Studio** — paste lyrics and adjust how many lines go on each slide.\n• **Setlists** — each row is one item; songs expand to **all** their slides in order in Present.`,
    };
  }

  if (/background|image|colour|color|visual|look/.test(q)) {
    return {
      tag: "visual",
      text: `**Backgrounds:**\n\n• In **Songs**, choose a preset image, a solid colour, or paste an image link — it applies across that song’s slides (you can still override per slide).\n• **Slide Studio** is for trying ideas; save in **Songs** when you want it in Present.`,
    };
  }

  if (/setlist|order|service|run ?sheet/.test(q)) {
    return {
      tag: "setlist",
      text: `**Setlist flow:**\n\n1. **Setlists** — open yours and drag the handle to reorder items.\n2. **Dashboard** — pick a setlist; the preview walks through **every slide** in order.\n3. **Present**, **Audience**, and **Remote** stay in sync for the same room.\n\nA song with five slides becomes five steps in Present for that spot.`,
    };
  }

  if (/present|projector|audience|remote|room/.test(q)) {
    return {
      tag: "present",
      text: `**Presenting:**\n\n• **Present** — your control screen with what’s next.\n• **Audience** — what the room sees (you can go fullscreen).\n• **Remote** — control from a phone or tablet using the same **room** name.\n\nThe deck is your setlist flattened: every slide from every song, in order.`,
    };
  }

  if (/new song|add song|create song|first song|song presentation|polish.*slide/.test(q)) {
    return {
      tag: "song",
      text: `**New songs:** when you add a song with **AI**, worshipflow2 can suggest a **background** from the feel of your title and lyrics and pack lines **about two per slide** for easier reading on screen. That happens when you tap **Add to library** in **Songs** or **Save song and add** from a setlist.`,
    };
  }

  return {
    tag: "general",
    text: `Thanks for your message.\n\nTry asking about **splitting slides**, **setlists**, **a verse about hope**, or **how Present works**. The sidebar **Tutorial** is a great place to start too.`,
  };
}

export const AI_ASSISTANT_SEED =
  "Hi — I’m here to help with **slides** (several slides per song), **setlists**, **scripture ideas**, **backgrounds**, and **presenting**. Tap a suggestion below or type your own question. **New songs:** use **AI** to draft slides for review, or **Manual** if you prefer to paste lyrics yourself. You can open **Tutorial** from the sidebar anytime.";

export type SongPresentSlide = { title: string; lines: string[] };

/** True when title + artist look like “No One Like The Lord” + Bethel (demo stub — not added to built-in library). */
export function isDummyBethelNoOneLikeTheLordSearch(title: string, artist: string): boolean {
  const blob = `${title} ${artist}`.toLowerCase();
  if (!/\bbethel\b/.test(blob)) return false;
  if (!/\b(lord|jesus)\b/.test(blob)) return false;
  return /no\s*one\s+like|noone\s*like|no-one\s+like/.test(blob.replace(/\s+/g, " "));
}

function getDummyBethelNoOneLikeSlides(songTitle: string): SongPresentSlide[] {
  const t = songTitle.trim() || "No One Like The Lord";
  return [
    {
      title: `${t} · Verse 1`,
      lines: [
        "(Demo) Replace with your licensed lyrics before service",
        "(Demo) Two short lines per slide read well on screen",
      ],
    },
    {
      title: `${t} · Verse 2`,
      lines: [
        "(Demo) Stub for “search Bethel + title” flow — edit freely",
        "(Demo) Second verse pair",
      ],
    },
    {
      title: `${t} · Chorus`,
      lines: [
        "(Demo) Big sing moment — keep lines under ~8 words if you can",
        "(Demo) Second chorus line (split repeats on extra slides)",
      ],
    },
    {
      title: `${t} · Chorus repeat`,
      lines: [
        "(Demo) Optional repeat / gang vocal lines",
        "(Demo) Or delete this slide in review",
      ],
    },
    {
      title: `${t} · Bridge`,
      lines: [
        "(Demo) Bridge section — build intensity here",
        "(Demo) Add more slides in Songs after save if needed",
      ],
    },
    {
      title: `${t} · Tag / out`,
      lines: ["(Demo) Tag or final lift — one line is fine", ""],
    },
  ].map((s) => ({ ...s, lines: s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0) }));
}

function getGenericTitleOnlyAiSlides(songTitle: string): SongPresentSlide[] {
  const t = songTitle.trim() || "Untitled";
  return [
    {
      title: `${t} · Verse 1`,
      lines: ["(Demo) AI stub — paste or type real lyrics in review", "(Demo) Second line for projection"],
    },
    {
      title: `${t} · Chorus`,
      lines: ["(Demo) Chorus line one", "(Demo) Chorus line two"],
    },
    {
      title: `${t} · Bridge`,
      lines: ["(Demo) Bridge line one", "(Demo) Bridge line two"],
    },
    {
      title: `${t} · Tag`,
      lines: ["(Demo) Optional ending", ""],
    },
  ].map((s) => ({ ...s, lines: s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0) }));
}

/** Dummy “AI presentation” for newly created songs — background mood + readable slide splits. */
export function getDummyNewSongPresentation(input: {
  title: string;
  lyrics: string;
  artist?: string;
}): {
  slides: SongPresentSlide[];
  backgroundUrl: string;
  structure: string;
  note: string;
} {
  const title = input.title.trim() || "Untitled";
  const artist = (input.artist ?? "").trim();
  const raw = input.lyrics.trim();

  if (isDummyBethelNoOneLikeTheLordSearch(title, artist)) {
    const slides = getDummyBethelNoOneLikeSlides(title);
    const bg = BACKGROUND_PRESETS.find((p) => p.id === "concert") ?? BACKGROUND_PRESETS[5]!;
    const structure = "Verse / Chorus / Bridge (demo)";
    return {
      slides,
      backgroundUrl: bg.url,
      structure,
      note: `${AI_DUMMY_META.modelLabel} — matched “No One Like The Lord” + Bethel (dummy slides only; not saved until you add to library). Stage-style background (test data).`,
    };
  }

  const mood = `${title} ${artist} ${raw}`.toLowerCase();

  let presetIdx = 3;
  if (/night|dark|star|sky|heaven|eternal|forever/.test(mood)) presetIdx = 4;
  else if (/ocean|water|river|wave|rain|bapti/.test(mood)) presetIdx = 2;
  else if (/forest|tree|green|mountain|path|walk/.test(mood)) presetIdx = 1;
  else if (/joy|dance|praise|celebrat|victory|shout|king/.test(mood)) presetIdx = 5;
  else if (/cross|blood|grace|mercy|calvary|golgotha|sacrifice/.test(mood)) presetIdx = 0;
  else if (/stage|haze|concert|light|beam/.test(mood)) presetIdx = 6;

  presetIdx = Math.min(presetIdx, BACKGROUND_PRESETS.length - 1);
  const bg = BACKGROUND_PRESETS[presetIdx]!;

  let slides: SongPresentSlide[];
  let structure: string;

  if (raw) {
    const cards = lyricsToSlideCards(raw, 2);
    structure = [...new Set(cards.map((c) => c.title))].join(" / ").trim() || "Custom";
    slides = cards.map((c) => ({
      title: `${title} · ${c.title}`,
      lines: c.lines.map((l) => l.trimEnd()),
    }));
  } else {
    slides = getGenericTitleOnlyAiSlides(title);
    structure = "Verse / Chorus / Bridge (AI stub)";
  }

  return {
    slides,
    backgroundUrl: bg.url,
    structure,
    note: `${AI_DUMMY_META.modelLabel} — “${bg.label}” background, 2 lines/slide for projection (test data).`,
  };
}

export type CustomSetlistBlockKind = "prayer" | "moment" | "other";

/** Dummy AI for prayer / moment / other setlist rows: background + optional sample slides. */
export function getDummyCustomSetlistBlock(input: {
  kind: CustomSetlistBlockKind;
  prompt: string;
  contentMode: "ai_text" | "user_text";
}): {
  backgroundUrl: string;
  slides: SongPresentSlide[];
  itemTypography: SlideTypography;
  note: string;
} {
  const p = `${input.kind} ${input.prompt}`.toLowerCase();
  let presetIdx = 3;
  if (input.kind === "prayer") presetIdx = 0;
  else if (input.kind === "moment") presetIdx = 2;
  else presetIdx = 5;
  if (/night|dark|star|sky|heaven/.test(p)) presetIdx = 4;
  else if (/ocean|water|river|wave/.test(p)) presetIdx = 2;
  else if (/forest|mist|calm|still/.test(p)) presetIdx = 1;
  else if (/joy|celebrat|welcome|bright/.test(p)) presetIdx = 6;
  presetIdx = Math.min(presetIdx, BACKGROUND_PRESETS.length - 1);
  const bg = BACKGROUND_PRESETS[presetIdx]!;

  const itemTypography: SlideTypography = input.kind === "prayer" ? "editorial" : "default";
  const hint = input.prompt.trim().slice(0, 48) || "This block";

  if (input.contentMode === "user_text") {
    return {
      backgroundUrl: bg.url,
      slides: [{ title: "Slide 1", lines: [""] }],
      itemTypography,
      note: `${AI_DUMMY_META.modelLabel} — “${bg.label}” background for this block; type your lines in review (test data).`,
    };
  }

  if (input.kind === "prayer") {
    return {
      backgroundUrl: bg.url,
      itemTypography,
      slides: [
        {
          title: `${hint} · Quiet`,
          lines: [
            "(Demo) Father, still our hearts in Your presence",
            "(Demo) We make space to listen and adore",
          ],
        },
        {
          title: `${hint} · Intercession`,
          lines: [
            "(Demo) We lift up those who are weary today",
            "(Demo) Let Your peace rule in our church and city",
          ],
        },
        {
          title: `${hint} · Close`,
          lines: ["(Demo) In Jesus’ name, amen.", ""],
        },
      ].map((s) => ({ ...s, lines: s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0) })),
      note: `${AI_DUMMY_META.modelLabel} — sample prayer slides + “${bg.label}” (edit before service; test data).`,
    };
  }

  if (input.kind === "moment") {
    return {
      backgroundUrl: bg.url,
      itemTypography: "editorial",
      slides: [
        {
          title: `${hint} · Moment`,
          lines: [
            "(Demo) Take a quiet moment to reflect",
            "(Demo) What is God stirring in you?",
          ],
        },
        {
          title: `${hint} · Response`,
          lines: ["(Demo) Optional response prompt — edit freely", ""],
        },
      ].map((s) => ({ ...s, lines: s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0) })),
      note: `${AI_DUMMY_META.modelLabel} — transitional moment + “${bg.label}” (test data).`,
    };
  }

  return {
    backgroundUrl: bg.url,
    itemTypography: "default",
    slides: [
      {
        title: `${hint} · Slide 1`,
        lines: [
          "(Demo) Announcement or instruction line one",
          "(Demo) Details — time, location, next step",
        ],
      },
      {
        title: `${hint} · Slide 2`,
        lines: ["(Demo) Closing line or call to action", ""],
      },
    ].map((s) => ({ ...s, lines: s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0) })),
    note: `${AI_DUMMY_META.modelLabel} — generic custom block + “${bg.label}” (test data).`,
  };
}

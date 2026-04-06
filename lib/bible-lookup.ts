/** Sample John 3:16 wording per translation for in-app lookup (not a live Bible API). */
export const BIBLE_TRANSLATIONS = {
  NIV: {
    ref: "John 3:16",
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
  },
  ESV: {
    ref: "John 3:16",
    text: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
  },
  NLT: {
    ref: "John 3:16",
    text: "For this is how God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life.",
  },
  KJV: {
    ref: "John 3:16",
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  },
  NKJV: {
    ref: "John 3:16",
    text: "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
  },
  CSB: {
    ref: "John 3:16",
    text: "For God loved the world in this way: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life.",
  },
  NASB: {
    ref: "John 3:16",
    text: "For God so loved the world, that He gave His only begotten Son, that whoever believes in Him shall not perish, but have eternal life.",
  },
  NET: {
    ref: "John 3:16",
    text: "For this is the way God loved the world: He gave his one and only Son that everyone who believes in him should not perish but have eternal life.",
  },
  AMP: {
    ref: "John 3:16",
    text: "For God so [greatly] loved and dearly prized the world that He [even] gave His [One and] only begotten Son, so that whoever believes and trusts in Him [as Savior] shall not perish, but have eternal life.",
  },
  MSG: {
    ref: "John 3:16",
    text: "This is how much God loved the world: He gave his Son, his one and only Son. And this is why: so that no one need be destroyed; by believing in him, anyone can have a whole and lasting life.",
  },
  WEB: {
    ref: "John 3:16",
    text: "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
  },
  NRSVUE: {
    ref: "John 3:16",
    text: "For God so loved the world that he gave his only Son, so that everyone who believes in him may not perish but may have eternal life.",
  },
} as const;

export type BibleTranslationKey = keyof typeof BIBLE_TRANSLATIONS;

/** Stable ordering for selects and chips (Object.keys order is not guaranteed). */
export const BIBLE_TRANSLATION_ORDER: readonly BibleTranslationKey[] = [
  "NIV",
  "ESV",
  "NLT",
  "KJV",
  "NKJV",
  "CSB",
  "NASB",
  "NET",
  "AMP",
  "MSG",
  "WEB",
  "NRSVUE",
];

export const BIBLE_TRANSLATION_LABELS: Record<BibleTranslationKey, string> = {
  NIV: "New International Version",
  ESV: "English Standard Version",
  NLT: "New Living Translation",
  KJV: "King James Version",
  NKJV: "New King James Version",
  CSB: "Christian Standard Bible",
  NASB: "New American Standard Bible",
  NET: "New English Translation",
  AMP: "Amplified Bible",
  MSG: "The Message",
  WEB: "World English Bible",
  NRSVUE: "New Revised Standard Version Updated Edition",
};

export function lookupScripture(
  query: string,
  translation: BibleTranslationKey = "NIV",
): { ref: string; text: string } {
  const q = query.trim().toLowerCase();
  if (q.includes("armor") || q.includes("armour") || q.includes("full armor")) {
    return {
      ref: "Ephesians 6:10–11",
      text: "Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil’s schemes.",
    };
  }
  if (q.includes("anxiety") || q.includes("worry")) {
    return {
      ref: "Philippians 4:6–7",
      text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
    };
  }
  return BIBLE_TRANSLATIONS[translation];
}

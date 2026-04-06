/** Bundled sample wording for common references (not a live Bible API). */

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

/** Sample NIV-style text for bundled passages (same wording for all translation picks). */
const BUNDLED_SNIPPETS: { ref: string; text: string; patterns: RegExp[] }[] = [
  {
    ref: "Ephesians 6:10–11",
    text: "Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil’s schemes.",
    patterns: [/armor|armour|full\s+armor|ephesians\s*6/i],
  },
  {
    ref: "Philippians 4:6–7",
    text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
    patterns: [
      /anxiet|worry|worried/,
      /\bphil\w*\s*4\s*:\s*[67]\b/i,
      /\bphilippians\s*4\s*:\s*[67]\b/i,
    ],
  },
  {
    ref: "Romans 8:28",
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    patterns: [/\brom\w*\s*8\s*:\s*28\b/i, /\bromans\s*8\s*:\s*28\b/i],
  },
  {
    ref: "Romans 12:2",
    text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God’s will is—his good, pleasing and perfect will.",
    patterns: [/\brom\w*\s*12\s*:\s*2\b/i, /\bromans\s*12\s*:\s*2\b/i],
  },
  {
    ref: "Psalm 23:1–3",
    text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
    patterns: [/\bps\w*\s*23\b/i, /\bpsalm\s*23\b/i],
  },
  {
    ref: "Jeremiah 29:11",
    text: "“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.”",
    patterns: [/\bjer\w*\s*29\s*:\s*11\b/i, /\bjeremiah\s*29\s*:\s*11\b/i],
  },
  {
    ref: "Proverbs 3:5–6",
    text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    patterns: [/\bprov\w*\s*3\s*:\s*[56]/i, /\bproverbs\s*3\s*:\s*[56]/i],
  },
  {
    ref: "Isaiah 40:31",
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    patterns: [/\bisa\w*\s*40\s*:\s*31\b/i, /\bisaiah\s*40\s*:\s*31\b/i],
  },
  {
    ref: "Matthew 11:28",
    text: "Come to me, all you who are weary and burdened, and I will give you rest.",
    patterns: [/\bmatt\w*\s*11\s*:\s*28\b/i, /\bmatthew\s*11\s*:\s*28\b/i],
  },
  {
    ref: "Genesis 1:1",
    text: "In the beginning God created the heavens and the earth.",
    patterns: [/\bgen\w*\s*1\s*:\s*1\b/i, /\bgenesis\s*1\s*:\s*1\b/i],
  },
  {
    ref: "Joshua 1:9",
    text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    patterns: [/\bjosh\w*\s*1\s*:\s*9\b/i, /\bjoshua\s*1\s*:\s*9\b/i],
  },
];

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function isJohn316Query(q: string): boolean {
  const n = normalizeQuery(q);
  if (/^1\s+john\s/.test(n)) return false;
  return (
    /\bjohn\s+3\s*:\s*16\b/.test(n) ||
    /\bjn\s*3\s*:\s*16\b/.test(n) ||
    /\bjohn\s+3\s+16\b/.test(n)
  );
}

/**
 * Returns bundled sample text for a small set of references, or null if unknown.
 * (Does not default to John 3:16 — callers should use AI / topic flow when null.)
 */
export function lookupScripture(
  query: string,
  translation: BibleTranslationKey = "NIV",
): { ref: string; text: string } | null {
  const raw = query.trim();
  if (!raw) return null;

  if (isJohn316Query(raw)) {
    return BIBLE_TRANSLATIONS[translation];
  }

  const n = normalizeQuery(raw);
  for (const s of BUNDLED_SNIPPETS) {
    if (s.patterns.some((re) => re.test(n) || re.test(raw))) {
      return { ref: s.ref, text: s.text };
    }
  }

  return null;
}

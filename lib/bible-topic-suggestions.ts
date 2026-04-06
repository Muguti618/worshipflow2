import type { BibleTranslationKey } from "@/lib/bible-lookup";

export type VerseSuggestion = {
  ref: string;
  text: string;
  /** Short note on why this passage fits the topic. */
  blurb: string;
};

type TopicPack = {
  /** Return true if this pack applies to the normalized topic string. */
  match: (topic: string) => boolean;
  verses: VerseSuggestion[];
};

const PACKS: TopicPack[] = [
  {
    match: (t) =>
      /anxiet|worry|worried|stress|stressed|fear|afraid|nervous|panic|calm|peace of mind/.test(t),
    verses: [
      {
        ref: "Philippians 4:6–7",
        text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
        blurb: "Prayer and God’s peace instead of carrying worry alone.",
      },
      {
        ref: "1 Peter 5:7",
        text: "Cast all your anxiety on him because he cares for you.",
        blurb: "God invites you to hand over what weighs on you.",
      },
      {
        ref: "Matthew 6:34",
        text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.",
        blurb: "Jesus calls us to today-sized trust, not endless “what if.”",
      },
      {
        ref: "Isaiah 41:10",
        text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.",
        blurb: "God’s presence and strength in moments that feel overwhelming.",
      },
    ],
  },
  {
    match: (t) => /hope|discourag|despair|future|tomorrow|wait(ing)? on god|persever/.test(t),
    verses: [
      {
        ref: "Romans 15:13",
        text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.",
        blurb: "Hope is something God grows in us as we trust him.",
      },
      {
        ref: "Jeremiah 29:11",
        text: "“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.”",
        blurb: "God’s intent toward his people is good, not ruin.",
      },
      {
        ref: "Romans 8:28",
        text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
        blurb: "God is able to weave even hard things into his purpose.",
      },
      {
        ref: "Hebrews 10:23",
        text: "Let us hold unswervingly to the hope we profess, for he who promised is faithful.",
        blurb: "Our hope rests on God’s faithfulness, not our circumstances.",
      },
    ],
  },
  {
    match: (t) =>
      /love|kindness|compassion|forgive|forgiveness|mercy|grace|reconcil/.test(t),
    verses: [
      {
        ref: "John 3:16",
        text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
        blurb: "The heart of the gospel: God’s love shown in Jesus.",
      },
      {
        ref: "1 Corinthians 13:4–5",
        text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.",
        blurb: "A practical picture of love in relationships.",
      },
      {
        ref: "Ephesians 2:8–9",
        text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.",
        blurb: "We receive forgiveness and new life as God’s gift.",
      },
      {
        ref: "Colossians 3:13",
        text: "Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.",
        blurb: "Forgiving others flows from how Christ forgave us.",
      },
    ],
  },
  {
    match: (t) =>
      /faith|trust|believe|doubt|walk by faith|depend on god|rely on god/.test(t),
    verses: [
      {
        ref: "Hebrews 11:1",
        text: "Now faith is confidence in what we hope for and assurance about what we do not see.",
        blurb: "Faith is steady trust in God’s promises, seen or unseen.",
      },
      {
        ref: "Proverbs 3:5–6",
        text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
        blurb: "Leaning on God’s wisdom instead of only our own.",
      },
      {
        ref: "Mark 9:24",
        text: "Immediately the boy’s father exclaimed, “I do believe; help me overcome my unbelief!”",
        blurb: "Honest prayer when faith feels mixed or weak.",
      },
      {
        ref: "Romans 10:17",
        text: "Consequently, faith comes from hearing the message, and the message is heard through the word about Christ.",
        blurb: "God builds faith as we hear and hold to his Word.",
      },
    ],
  },
  {
    match: (t) =>
      /strength|weak|weary|tired|courage|brave|stand firm|persecut|trial|suffer/.test(t),
    verses: [
      {
        ref: "Isaiah 40:31",
        text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
        blurb: "God renews strength for those who wait on him.",
      },
      {
        ref: "2 Corinthians 12:9",
        text: "But he said to me, “My grace is sufficient for you, for my power is made perfect in weakness.” Therefore I will boast all the more gladly about my weaknesses, so that Christ’s power may rest on me.",
        blurb: "Christ’s strength shows up in our honest weakness.",
      },
      {
        ref: "Joshua 1:9",
        text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
        blurb: "Courage grounded in God’s presence, not self-sufficiency.",
      },
      {
        ref: "Psalm 46:1",
        text: "God is our refuge and strength, an ever-present help in trouble.",
        blurb: "A steady place to run when life shakes.",
      },
    ],
  },
  {
    match: (t) =>
      /worship|praise|thank|adore|sing|glory|magnif/.test(t),
    verses: [
      {
        ref: "Psalm 100:2",
        text: "Worship the Lord with gladness; come before him with joyful songs.",
        blurb: "Joyful, singing worship as we draw near to God.",
      },
      {
        ref: "John 4:24",
        text: "God is spirit, and his worshipers must worship in the Spirit and in truth.",
        blurb: "Worship that is real in heart and aligned with truth.",
      },
      {
        ref: "Psalm 95:1–2",
        text: "Come, let us sing for joy to the Lord; let us shout aloud to the Rock of our salvation. Let us come before him with thanksgiving and extol him with music and song.",
        blurb: "A call to the congregation to praise together.",
      },
      {
        ref: "Colossians 3:16",
        text: "Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom through psalms, hymns, and songs from the Spirit, singing to God with gratitude in your hearts.",
        blurb: "Word-filled, thankful singing in community.",
      },
    ],
  },
  {
    match: (t) =>
      /comfort|grief|mourning|loss|sad|heal|broken heart|pain/.test(t),
    verses: [
      {
        ref: "Matthew 5:4",
        text: "Blessed are those who mourn, for they will be comforted.",
        blurb: "Jesus sees grief and promises God’s comfort.",
      },
      {
        ref: "Psalm 34:18",
        text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
        blurb: "God draws near when we feel shattered.",
      },
      {
        ref: "2 Corinthians 1:3–4",
        text: "Praise be to the God and Father of our Lord Jesus Christ, the Father of compassion and the God of all comfort, who comforts us in all our troubles, so that we can comfort those in any trouble with the comfort we ourselves receive from God.",
        blurb: "God’s comfort in us spills over to others.",
      },
      {
        ref: "Revelation 21:4",
        text: "He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away.",
        blurb: "A future where God ends sorrow forever.",
      },
    ],
  },
  {
    match: (t) =>
      /armor|armour|spiritual warfare|enemy|temptation|stand against evil|devil|evil one/.test(t),
    verses: [
      {
        ref: "Ephesians 6:10–11",
        text: "Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil’s schemes.",
        blurb: "Strength and protection are found in the Lord, not ourselves.",
      },
      {
        ref: "James 4:7",
        text: "Submit yourselves, then, to God. Resist the devil, and he will flee from you.",
        blurb: "Humility before God and firm resistance to evil.",
      },
      {
        ref: "1 Peter 5:8–9",
        text: "Be alert and of sober mind. Your enemy the devil prowls around like a roaring lion looking for someone to devour. Resist him, standing firm in the faith.",
        blurb: "Staying watchful and grounded in faith together.",
      },
    ],
  },
];

const DEFAULT_SUGGESTIONS: VerseSuggestion[] = [
  {
    ref: "John 3:16",
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    blurb: "God’s love and the gift of life in Jesus.",
  },
  {
    ref: "Psalm 23:1",
    text: "The Lord is my shepherd, I lack nothing.",
    blurb: "God as caring shepherd — provision and guidance.",
  },
  {
    ref: "Micah 6:8",
    text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.",
    blurb: "A compact summary of how to live with God.",
  },
  {
    ref: "Romans 12:2",
    text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God’s will is—his good, pleasing and perfect will.",
    blurb: "Letting God reshape how we think and live.",
  },
];

/**
 * Curated suggestions for worship planning (local “AI-style” matcher).
 * Wire `/api/bible/suggest` to a language model later for open-ended topics.
 */
export function suggestVersesForTopic(
  topic: string,
  _translation: BibleTranslationKey,
): VerseSuggestion[] {
  void _translation;
  const t = topic.trim().toLowerCase();
  if (!t) return [...DEFAULT_SUGGESTIONS];

  for (const pack of PACKS) {
    if (pack.match(t)) {
      return [...pack.verses];
    }
  }

  return [...DEFAULT_SUGGESTIONS];
}

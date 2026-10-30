import { z } from "zod";

/** English plus the 22 languages in the Eighth Schedule of the Indian Constitution. */
export const languages = [
  { code: "en", name: "English", native: "English", script: "Latin" },
  { code: "hi", name: "Hindi", native: "हिन्दी", script: "Devanagari" },
  { code: "bn", name: "Bengali", native: "বাংলা", script: "Bengali" },
  { code: "te", name: "Telugu", native: "తెలుగు", script: "Telugu" },
  { code: "mr", name: "Marathi", native: "मराठी", script: "Devanagari" },
  { code: "ta", name: "Tamil", native: "தமிழ்", script: "Tamil" },
  { code: "ur", name: "Urdu", native: "اردو", script: "Perso-Arabic (Nastaliq)" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", script: "Gujarati" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", script: "Kannada" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", script: "Odia" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", script: "Malayalam" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", script: "Gurmukhi" },
  { code: "as", name: "Assamese", native: "অসমীয়া", script: "Assamese (Bengali-Assamese)" },
  { code: "mai", name: "Maithili", native: "मैथिली", script: "Devanagari" },
  { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", script: "Ol Chiki" },
  { code: "ks", name: "Kashmiri", native: "کٲشُر", script: "Perso-Arabic" },
  { code: "ne", name: "Nepali", native: "नेपाली", script: "Devanagari" },
  { code: "sd", name: "Sindhi", native: "سنڌي", script: "Perso-Arabic" },
  { code: "doi", name: "Dogri", native: "डोगरी", script: "Devanagari" },
  { code: "kok", name: "Konkani", native: "कोंकणी", script: "Devanagari" },
  { code: "mni", name: "Manipuri (Meitei)", native: "ꯃꯤꯇꯩꯂꯣꯟ", script: "Meitei Mayek" },
  { code: "brx", name: "Bodo", native: "बड़ो", script: "Devanagari" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्", script: "Devanagari" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];
const codes = languages.map((item) => item.code) as [LanguageCode, ...LanguageCode[]];

export const languageSettingSchema = z.object({
  primary: z.enum(codes),
  mixWith: z.array(z.enum(codes)).max(2).default([]),
  script: z.enum(["native", "roman"]).default("native"),
  mixLevel: z.enum(["light", "balanced", "heavy"]).default("balanced"),
});
export type LanguageSetting = z.infer<typeof languageSettingSchema>;

export const channelKeys = ["blog", "linkedin", "xThread", "instagram", "metaAds", "googleAds"] as const;
export type ChannelKey = (typeof channelKeys)[number];
export const channelLabels: Record<ChannelKey, string> = {
  blog: "Blog post",
  linkedin: "LinkedIn",
  xThread: "X thread",
  instagram: "Instagram",
  metaAds: "Meta ads",
  googleAds: "Google ads",
};

export const english: LanguageSetting = { primary: "en", mixWith: [], script: "native", mixLevel: "balanced" };
export const defaultChannelLanguages = Object.fromEntries(channelKeys.map((key) => [key, english])) as Record<ChannelKey, LanguageSetting>;

export const channelLanguagesSchema = z.object({
  blog: languageSettingSchema,
  linkedin: languageSettingSchema,
  xThread: languageSettingSchema,
  instagram: languageSettingSchema,
  metaAds: languageSettingSchema,
  googleAds: languageSettingSchema,
});
export type ChannelLanguages = z.infer<typeof channelLanguagesSchema>;

/** Popular code-mixed styles, offered as one-click presets. */
export const languagePresets: { label: string; setting: LanguageSetting }[] = [
  { label: "English", setting: english },
  { label: "हिन्दी", setting: { primary: "hi", mixWith: [], script: "native", mixLevel: "balanced" } },
  { label: "Hinglish", setting: { primary: "hi", mixWith: ["en"], script: "roman", mixLevel: "balanced" } },
  { label: "Tanglish", setting: { primary: "ta", mixWith: ["en"], script: "roman", mixLevel: "balanced" } },
  { label: "Tenglish", setting: { primary: "te", mixWith: ["en"], script: "roman", mixLevel: "balanced" } },
  { label: "Kanglish", setting: { primary: "kn", mixWith: ["en"], script: "roman", mixLevel: "balanced" } },
  { label: "Manglish", setting: { primary: "ml", mixWith: ["en"], script: "roman", mixLevel: "balanced" } },
  { label: "Banglish", setting: { primary: "bn", mixWith: ["en"], script: "roman", mixLevel: "balanced" } },
  { label: "Marathi + English", setting: { primary: "mr", mixWith: ["en"], script: "native", mixLevel: "balanced" } },
  { label: "Gujarati + English", setting: { primary: "gu", mixWith: ["en"], script: "native", mixLevel: "balanced" } },
  { label: "Punjabi + English", setting: { primary: "pa", mixWith: ["en"], script: "roman", mixLevel: "balanced" } },
];

/** Languages Google Ads accepts for ad text (Indian subset + English). */
export const googleAdsLanguages: LanguageCode[] = ["en", "hi", "bn", "gu", "kn", "ml", "mr", "pa", "ta", "te", "ur"];

export function languageInfo(code: LanguageCode) {
  return languages.find((item) => item.code === code) ?? languages[0];
}

export function sameSetting(a: LanguageSetting, b: LanguageSetting) {
  return a.primary === b.primary && a.script === b.script && a.mixLevel === b.mixLevel && a.mixWith.join() === b.mixWith.join();
}

/** Short label for badges, e.g. "Hinglish · Roman" or "Tamil + English". */
export function languageLabel(setting: LanguageSetting) {
  const preset = languagePresets.find((item) => sameSetting(item.setting, setting));
  if (preset) return preset.label;
  const names = [setting.primary, ...setting.mixWith].map((code) => languageInfo(code).name).join(" + ");
  return setting.primary !== "en" && setting.script === "roman" ? `${names} · Roman script` : names;
}

/** HTML lang attribute so browsers shape scripts correctly. */
export function htmlLang(setting: LanguageSetting) {
  return setting.script === "roman" && setting.primary !== "en" ? `${setting.primary}-Latn` : setting.primary;
}

export function isRtl(setting: LanguageSetting) {
  return setting.script === "native" && ["ur", "ks", "sd"].includes(setting.primary);
}

const mixDescriptions = {
  light: "mostly the primary language with occasional everyday words from the mixed language(s)",
  balanced: "natural, conversational code-mixing in roughly the proportion people actually use when speaking and posting online",
  heavy: "heavy code-mixing, with whole phrases switching between languages as in casual social media chat",
};

/** Precise instruction for the model describing how one deliverable must be written. */
export function languageInstruction(setting: LanguageSetting) {
  const primary = languageInfo(setting.primary);
  const mixes = setting.mixWith.filter((code) => code !== setting.primary).map(languageInfo);
  const scriptRule = setting.primary === "en" && !mixes.length
    ? "Use the Latin script."
    : setting.script === "roman"
      ? `Write everything in Roman (Latin) script, transliterated the way Indians commonly type ${primary.name} on phones (e.g. "aap kaise ho", not formal ISO transliteration).`
      : mixes.length
        ? `Write ${primary.name} words in ${primary.script} script; ${mixes.map((item) => `${item.name} words in ${item.script} script`).join(", ")}, exactly as people mix scripts online.`
        : `Write in ${primary.script} script.`;
  if (!mixes.length) {
    return `${primary.name} (${primary.native}). ${scriptRule} Write natively and idiomatically, as a native copywriter would, not as a literal translation from English.`;
  }
  return `Code-mixed ${[primary, ...mixes].map((item) => item.name).join(" + ")} with ${primary.name} as the base language: ${mixDescriptions[setting.mixLevel]}. ${scriptRule} The mix must sound like real people from that region talk, never word-by-word translation.`;
}

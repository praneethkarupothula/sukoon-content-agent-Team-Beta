"use client";

import { languagePresets, languages, sameSetting, type LanguageCode, type LanguageSetting } from "@/lib/languages";

type Props = { value: LanguageSetting; onChange: (value: LanguageSetting) => void; idPrefix: string; compact?: boolean };

export function LanguagePicker({ value, onChange, idPrefix, compact = false }: Props) {
  const mixFirst = value.mixWith[0] ?? "";
  const mixSecond = value.mixWith[1] ?? "";
  const setMix = (first: string, second: string) => {
    const mixWith = [first, second].filter((code, index, all) => code && code !== value.primary && all.indexOf(code) === index) as LanguageCode[];
    onChange({ ...value, mixWith });
  };
  return <div className={`lang-picker ${compact ? "compact" : ""}`}>
    <div className="lang-presets" role="group" aria-label="Language presets">
      {languagePresets.map((preset) => <button type="button" key={preset.label} className={`lang-chip ${sameSetting(preset.setting, value) ? "active" : ""}`} onClick={() => onChange(preset.setting)}>{preset.label}</button>)}
    </div>
    <div className="lang-controls">
      <label className="lang-control"><span>Base language</span>
        <select id={`${idPrefix}-primary`} value={value.primary} onChange={(event) => {
          const primary = event.target.value as LanguageCode;
          onChange({ ...value, primary, mixWith: value.mixWith.filter((code) => code !== primary), script: primary === "en" ? "native" : value.script });
        }}>
          {languages.map((item) => <option key={item.code} value={item.code}>{item.name}{item.code !== "en" ? ` · ${item.native}` : ""}</option>)}
        </select>
      </label>
      <label className="lang-control"><span>Mix with</span>
        <select id={`${idPrefix}-mix`} value={mixFirst} onChange={(event) => setMix(event.target.value, event.target.value ? mixSecond : "")}>
          <option value="">No mixing</option>
          {languages.filter((item) => item.code !== value.primary).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>
      {mixFirst && <label className="lang-control"><span>and also</span>
        <select id={`${idPrefix}-mix2`} value={mixSecond} onChange={(event) => setMix(mixFirst, event.target.value)}>
          <option value="">—</option>
          {languages.filter((item) => item.code !== value.primary && item.code !== mixFirst).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>}
      {value.primary !== "en" && <label className="lang-control"><span>Script</span>
        <select id={`${idPrefix}-script`} value={value.script} onChange={(event) => onChange({ ...value, script: event.target.value as LanguageSetting["script"] })}>
          <option value="native">Native script</option>
          <option value="roman">Roman (Latin) letters</option>
        </select>
      </label>}
      {value.mixWith.length > 0 && <label className="lang-control"><span>Mixing</span>
        <select id={`${idPrefix}-level`} value={value.mixLevel} onChange={(event) => onChange({ ...value, mixLevel: event.target.value as LanguageSetting["mixLevel"] })}>
          <option value="light">Light</option>
          <option value="balanced">Balanced</option>
          <option value="heavy">Heavy</option>
        </select>
      </label>}
    </div>
  </div>;
}

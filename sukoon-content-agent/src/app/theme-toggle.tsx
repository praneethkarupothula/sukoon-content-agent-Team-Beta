"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { themeStorageKey as storageKey } from "./theme-script";

type Choice = "light" | "dark" | "system";

function apply(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function stored(): Choice {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    const initial = stored();
    const timer = window.setTimeout(() => setChoice(initial), 0);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (stored() === "system") apply("system"); };
    media.addEventListener("change", onChange);
    return () => { window.clearTimeout(timer); media.removeEventListener("change", onChange); };
  }, []);

  function choose(next: Choice) {
    setChoice(next);
    try { localStorage.setItem(storageKey, next); } catch { /* storage unavailable */ }
    apply(next);
  }

  const options: { id: Choice; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Day mode", icon: Sun },
    { id: "dark", label: "Night mode", icon: Moon },
    { id: "system", label: "Match system", icon: Monitor },
  ];
  return <div className="theme-toggle" role="group" aria-label="Theme">
    {options.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={choice === id} aria-label={label} title={label} onClick={() => choose(id)}><Icon size={14} /></button>)}
  </div>;
}

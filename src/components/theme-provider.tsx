"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { ChoiceChips } from "@/components/ui/choice-chips";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const THEME_STORAGE_KEY = "inner-compass-theme";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeListeners = new Set<() => void>();

function isThemePreference(
  value: string | null | undefined,
): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemePreference): ResolvedTheme {
  const resolved = theme === "system" ? systemTheme() : theme;
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.dataset.themePreference = theme;
  root.style.colorScheme = resolved;

  return resolved;
}

function currentThemePreference(): ThemePreference {
  if (typeof document === "undefined") return "system";

  const documentPreference = document.documentElement.dataset.themePreference;
  if (isThemePreference(documentPreference)) return documentPreference;

  try {
    const storedPreference = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system";
  }
}

function themeSnapshot(): `${ThemePreference}:${ResolvedTheme}` {
  if (typeof window === "undefined") return "system:light";

  const preference = currentThemePreference();
  const documentTheme = document.documentElement.dataset.theme;
  const resolved =
    documentTheme === "light" || documentTheme === "dark"
      ? documentTheme
      : preference === "system"
        ? systemTheme()
        : preference;

  return `${preference}:${resolved}`;
}

function serverThemeSnapshot(): `${ThemePreference}:${ResolvedTheme}` {
  return "system:light";
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  function handleSystemThemeChange() {
    if (currentThemePreference() === "system") {
      applyTheme("system");
      notifyThemeListeners();
    }
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY) return;
    const nextTheme = isThemePreference(event.newValue)
      ? event.newValue
      : "system";
    applyTheme(nextTheme);
    notifyThemeListeners();
  }

  media.addEventListener("change", handleSystemThemeChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    themeListeners.delete(listener);
    media.removeEventListener("change", handleSystemThemeChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export const themeBootScript = `
(() => {
  try {
    const saved = localStorage.getItem("${THEME_STORAGE_KEY}");
    const preference = saved === "light" || saved === "dark" ? saved : "system";
    const resolved = preference === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;
  } catch (_) {
    const resolved = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = "system";
    document.documentElement.style.colorScheme = resolved;
  }
})();`;

export function ThemeScript() {
  return (
    <script
      id="inner-compass-theme"
      dangerouslySetInnerHTML={{ __html: themeBootScript }}
    />
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeToTheme,
    themeSnapshot,
    serverThemeSnapshot,
  );
  const [theme, resolvedTheme] = snapshot.split(":") as [
    ThemePreference,
    ResolvedTheme,
  ];

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The visual preference still applies for the current session.
    }
    applyTheme(nextTheme);
    notifyThemeListeners();
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme muss innerhalb von ThemeProvider verwendet werden.");
  }
  return context;
}

export function ThemeSelector({
  legend = "Darstellung",
  className,
}: {
  legend?: string;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <ChoiceChips<ThemePreference>
      legend={legend}
      className={className}
      value={theme}
      onChange={setTheme}
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Hell" },
        { value: "dark", label: "Dunkel" },
      ]}
    />
  );
}

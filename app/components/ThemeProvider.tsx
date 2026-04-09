"use client"

import { useEffect } from "react"

interface Theme {
  primary: string
  secondary: string
  accent: string
  neutral: string
}

const DEFAULT: Theme = {
  primary: "#6366f1",
  secondary: "#7c3aed",
  accent: "#facc15",
  neutral: "#1e293b",
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

export function applyTheme(theme: Partial<Theme>) {
  const t = { ...DEFAULT, ...theme }
  const root = document.documentElement
  root.style.setProperty("--color-primary", t.primary)
  root.style.setProperty("--color-primary-rgb", hexToRgb(t.primary))
  root.style.setProperty("--color-secondary", t.secondary)
  root.style.setProperty("--color-secondary-rgb", hexToRgb(t.secondary))
  root.style.setProperty("--color-accent", t.accent)
  root.style.setProperty("--color-accent-rgb", hexToRgb(t.accent))
  root.style.setProperty("--color-neutral", t.neutral)
  root.style.setProperty("--color-neutral-rgb", hexToRgb(t.neutral))
}

export default function ThemeProvider({ theme }: { theme?: Partial<Theme> }) {
  useEffect(() => {
    applyTheme(theme ?? DEFAULT)
  }, [theme])

  // Also inject as inline style on :root for SSR
  const t = { ...DEFAULT, ...theme }
  const cssVars = `
    :root {
      --color-primary: ${t.primary};
      --color-primary-rgb: ${hexToRgb(t.primary)};
      --color-secondary: ${t.secondary};
      --color-secondary-rgb: ${hexToRgb(t.secondary)};
      --color-accent: ${t.accent};
      --color-accent-rgb: ${hexToRgb(t.accent)};
      --color-neutral: ${t.neutral};
      --color-neutral-rgb: ${hexToRgb(t.neutral)};
    }
  `
  return <style dangerouslySetInnerHTML={{ __html: cssVars }} />
}

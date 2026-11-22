/**
 * Utility functions for the application
 */

/**
 * Combines multiple class names with support for conditional classes
 * Similar to clsx/classnames library but lightweight
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes
    .filter((c): c is string => typeof c === "string")
    .join(" ")
}

/**
 * Formats a number as a locale-specific string
 */
export function formatNumber(num: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Formats distance in km with one decimal place
 */
export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`
}

/**
 * Formats time duration in HH:MM:SS format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

/**
 * Formats pace in min/km
 */
export function formatPace(minPerKm: number): string {
  if (!minPerKm || minPerKm === 0) return "N/A"
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + "..."
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Converts activity type to display name
 */
export function getActivityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    Run: "🏃 Running",
    Ride: "🚴 Cycling",
    Walk: "🚶 Walking",
    Swim: "🏊 Swimming",
    Workout: "💪 Workout",
    VirtualRun: "💻 Virtual Run",
    VirtualRide: "💻 Virtual Ride",
    Hike: "⛰️ Hiking",
    AlpineSki: "⛷️ Alpine Skiing",
    BackcountrySki: "🎿 Backcountry Skiing",
    Kayaking: "🛶 Kayaking",
    Sailing: "⛵ Sailing",
    Skateboarding: "🛹 Skateboarding",
    Snowboard: "🏂 Snowboarding",
    Surfing: "🏄 Surfing",
  }
  return labels[type] || `${capitalize(type)}`
}

/**
 * Gets color class for activity type
 */
export function getActivityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    Run: "text-red-500 bg-red-50",
    Ride: "text-blue-500 bg-blue-50",
    Walk: "text-green-500 bg-green-50",
    Swim: "text-cyan-500 bg-cyan-50",
    Workout: "text-purple-500 bg-purple-50",
    VirtualRun: "text-orange-500 bg-orange-50",
    VirtualRide: "text-indigo-500 bg-indigo-50",
    Hike: "text-amber-500 bg-amber-50",
    Kayaking: "text-teal-500 bg-teal-50",
    Sailing: "text-sky-500 bg-sky-50",
  }
  return colors[type] || "text-gray-500 bg-gray-50"
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Formats a date and time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Gets relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = (now.getTime() - d.getTime()) / 1000

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return formatDate(d)
}

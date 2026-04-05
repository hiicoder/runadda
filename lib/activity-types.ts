export const ACTIVITY_ICONS: Record<string, string> = {
  Run: "🏃",
  VirtualRun: "🏃",
  Walk: "🚶",
  Hike: "🥾",
  Ride: "🚴",
  VirtualRide: "🚴",
  EBikeRide: "⚡🚴",
  Swim: "🏊",
  Workout: "💪",
  WeightTraining: "🏋️",
  Yoga: "🧘",
  Crossfit: "🏋️",
  Elliptical: "🔄",
  StairStepper: "🪜",
  RockClimbing: "🧗",
  Kayaking: "🛶",
  Rowing: "🚣",
  Soccer: "⚽",
  Tennis: "🎾",
  Golf: "⛳",
  Skiing: "⛷️",
  Snowboard: "🏂",
  IceSkate: "⛸️",
  AlpineSki: "⛷️",
  NordicSki: "🎿",
  Skateboard: "🛹",
  Surfing: "🏄",
  Windsurf: "🏄",
  Kitesurf: "🪁",
  StandUpPaddling: "🏄",
  Canoeing: "🛶",
  WaterSport: "💧",
  Wheelchair: "♿",
  HandCycle: "🔄",
  InlineSkate: "🛼",
  Default: "🏅",
}

export function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type] ?? ACTIVITY_ICONS.Default
}

export function getActivityLabel(type: string): string {
  // Convert CamelCase to spaced words: "VirtualRun" → "Virtual Run"
  return type.replace(/([A-Z])/g, " $1").trim()
}

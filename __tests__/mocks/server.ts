import { setupServer } from "msw/node"
import { stravaHandlers } from "./strava-handlers"

export const server = setupServer(...stravaHandlers)

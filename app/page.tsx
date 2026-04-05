import PublicHome from "./PublicHome"

// Always show the public landing page at /
// Logged-in users can navigate to /dashboard via the app
export default function Home() {
  return <PublicHome />
}

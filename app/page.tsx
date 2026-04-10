import type { Metadata } from "next"
import PublicHome from "./PublicHome"

export const metadata: Metadata = {
  title: "RunAdda — Har Kadam Mein Masti | Running Club Patna",
  alternates: { canonical: "https://runadda.in" },
}

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "name": "RunAdda",
    "alternateName": "Run Adda",
    "url": "https://runadda.in",
    "logo": "https://runadda.in/logo.png",
    "description": "RunAdda is a vibrant running community in Patna. Join us for weekly runs, cycling, fitness events, and social service drives.",
    "slogan": "Har Kadam Mein Masti",
    "email": "runadda.in@gmail.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Patna",
      "addressRegion": "Bihar",
      "addressCountry": "IN"
    },
    "sport": ["Running", "Cycling", "Walking", "Swimming"],
    "sameAs": [
      "https://instagram.com/runadda",
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHome />
    </>
  )
}

import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/dashboard/"],
      },
    ],
    sitemap: "https://runadda.in/sitemap.xml",
  }
}

 //       disallow: ["/admin/", "/api/", "/dashboard/", "/profile/", "/activities/", "/leaderboard/"],
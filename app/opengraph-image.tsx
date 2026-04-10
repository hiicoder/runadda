import { ImageResponse } from "next/og"

export const alt = "RunAdda — Har Kadam Mein Masti"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #6366f1 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 80, fontWeight: 900, color: "white", letterSpacing: "-2px" }}>
          <span>Run</span><span style={{ color: "#facc15" }}>adda</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.8)", marginTop: 16, fontStyle: "italic" }}>
          Har Kadam Mein Masti
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.6)", marginTop: 12 }}>
          Running Community · Patna, Bihar
        </div>
        <div style={{
          display: "flex",
          marginTop: 40, padding: "12px 32px",
          background: "#facc15", borderRadius: 50,
          fontSize: 20, fontWeight: 700, color: "#1e293b"
        }}>
          runadda.in
        </div>
      </div>
    ),
    { ...size }
  )
}

import { ImageResponse } from "next/og";

// App icon / favicon — Next.js App Router convention (this file replaces
// app/favicon.ico automatically). Same navy + gold monogram used in the
// sidebar (app/(dashboard)/layout.tsx) and every public-facing header
// (login, homepage, customer authorization page) — one "P" mark, one place
// it's defined, instead of a static binary kept in sync by hand.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#12172b",
          color: "#b3872f",
          fontSize: 20,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}

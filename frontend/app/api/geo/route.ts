// Reads the country Vercel's edge network already detected for this
// request (x-vercel-ip-country) — no external geo-IP API call, no browser
// permission prompt. Only populated when actually running on Vercel; local
// dev / other hosts get {country: null} and lib/phone.ts's
// detectDefaultCountry() falls back to the browser's own locale.
export async function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country");
  return Response.json({ country });
}

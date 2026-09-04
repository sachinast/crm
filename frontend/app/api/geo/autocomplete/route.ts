import { NextResponse } from "next/server";

interface FormattedPlace {
  description: string;
  primary: string;
  secondary: string;
}

function formatPhotonPlace(p: Record<string, any>): FormattedPlace {
  const { name, housenumber, street, city, state, postcode, country } = p;

  let streetPart = "";
  if (housenumber && street) {
    streetPart = `${housenumber} ${street}`;
  } else if (street) {
    streetPart = street;
  }

  const primary = name && name !== housenumber ? name : streetPart || city || country || "";
  const secondaryParts = [
    primary !== streetPart ? streetPart : null,
    city,
    state,
    postcode,
    country,
  ].filter(Boolean);

  const unique = Array.from(new Set(secondaryParts));
  const secondary = unique.join(", ");
  const description = primary && secondary ? `${primary}, ${secondary}` : primary || secondary || "";

  return { description, primary, secondary };
}

function formatNominatimPlace(item: Record<string, any>): FormattedPlace {
  const name = item.name || item.display_name?.split(",")?.[0]?.trim() || "";
  const displayName = item.display_name || "";
  const secondary = displayName.startsWith(name)
    ? displayName.slice(name.length).replace(/^,\s*/, "")
    : displayName;

  return {
    description: displayName,
    primary: name,
    secondary: secondary || "",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // 1. Try Photon (Free OpenStreetMap-powered geocoding by Komoot, no key required)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (photonRes.ok) {
      const data = await photonRes.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        const seen = new Set<string>();
        const suggestions: FormattedPlace[] = [];

        for (const f of data.features) {
          if (!f.properties) continue;
          const formatted = formatPhotonPlace(f.properties);
          if (formatted.description && !seen.has(formatted.description.toLowerCase())) {
            seen.add(formatted.description.toLowerCase());
            suggestions.push(formatted);
          }
        }

        if (suggestions.length > 0) {
          return NextResponse.json(
            { suggestions },
            {
              headers: {
                "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
              },
            }
          );
        }
      }
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback: OpenStreetMap Nominatim (Free, no key required)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&addressdetails=1&limit=6`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TravelCRM-Address-Lookup/1.0",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (nominatimRes.ok) {
      const data = await nominatimRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const seen = new Set<string>();
        const suggestions: FormattedPlace[] = [];

        for (const item of data) {
          const formatted = formatNominatimPlace(item);
          if (formatted.description && !seen.has(formatted.description.toLowerCase())) {
            seen.add(formatted.description.toLowerCase());
            suggestions.push(formatted);
          }
        }

        return NextResponse.json(
          { suggestions },
          {
            headers: {
              "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
            },
          }
        );
      }
    }
  } catch {
    // Return empty if both fail
  }

  return NextResponse.json({ suggestions: [] });
}

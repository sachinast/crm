import { NextResponse } from "next/server";

interface FormattedPlace {
  description: string;
  primary: string;
  secondary: string;
}

interface AirportItem {
  code: string;
  name: string;
  city: string;
  state: string;
  country: string;
}

const POPULAR_AIRPORTS_AND_HUBS: AirportItem[] = [
  // United States
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", state: "GA", country: "United States" },
  { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", state: "CA", country: "United States" },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", state: "IL", country: "United States" },
  { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas-Fort Worth", state: "TX", country: "United States" },
  { code: "DEN", name: "Denver International Airport", city: "Denver", state: "CO", country: "United States" },
  { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", state: "NY", country: "United States" },
  { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", state: "CA", country: "United States" },
  { code: "SEA", name: "Seattle-Tacoma International Airport", city: "Seattle", state: "WA", country: "United States" },
  { code: "LAS", name: "Harry Reid International Airport", city: "Las Vegas", state: "NV", country: "United States" },
  { code: "MCO", name: "Orlando International Airport", city: "Orlando", state: "FL", country: "United States" },
  { code: "EWR", name: "Newark Liberty International Airport", city: "Newark / New York", state: "NJ", country: "United States" },
  { code: "CLT", name: "Charlotte Douglas International Airport", city: "Charlotte", state: "NC", country: "United States" },
  { code: "PHX", name: "Phoenix Sky Harbor International Airport", city: "Phoenix", state: "AZ", country: "United States" },
  { code: "IAH", name: "George Bush Intercontinental Airport", city: "Houston", state: "TX", country: "United States" },
  { code: "MIA", name: "Miami International Airport", city: "Miami", state: "FL", country: "United States" },
  { code: "BOS", name: "Boston Logan International Airport", city: "Boston", state: "MA", country: "United States" },
  { code: "MSP", name: "Minneapolis-Saint Paul International Airport", city: "Minneapolis", state: "MN", country: "United States" },
  { code: "FLL", name: "Fort Lauderdale-Hollywood International Airport", city: "Fort Lauderdale", state: "FL", country: "United States" },
  { code: "DTW", name: "Detroit Metropolitan Wayne County Airport", city: "Detroit", state: "MI", country: "United States" },
  { code: "PHL", name: "Philadelphia International Airport", city: "Philadelphia", state: "PA", country: "United States" },
  { code: "LGA", name: "LaGuardia Airport", city: "New York", state: "NY", country: "United States" },
  { code: "BWI", name: "Baltimore/Washington International Airport", city: "Baltimore", state: "MD", country: "United States" },
  { code: "SLC", name: "Salt Lake City International Airport", city: "Salt Lake City", state: "UT", country: "United States" },
  { code: "SAN", name: "San Diego International Airport", city: "San Diego", state: "CA", country: "United States" },
  { code: "IAD", name: "Washington Dulles International Airport", city: "Washington", state: "DC", country: "United States" },
  { code: "DCA", name: "Ronald Reagan Washington National Airport", city: "Washington", state: "DC", country: "United States" },
  { code: "TPA", name: "Tampa International Airport", city: "Tampa", state: "FL", country: "United States" },
  { code: "MDW", name: "Chicago Midway International Airport", city: "Chicago", state: "IL", country: "United States" },
  { code: "HNL", name: "Daniel K. Inouye International Airport", city: "Honolulu", state: "HI", country: "United States" },
  { code: "PDX", name: "Portland International Airport", city: "Portland", state: "OR", country: "United States" },
  { code: "BNA", name: "Nashville International Airport", city: "Nashville", state: "TN", country: "United States" },
  { code: "AUS", name: "Austin-Bergstrom International Airport", city: "Austin", state: "TX", country: "United States" },
  { code: "DAL", name: "Dallas Love Field", city: "Dallas", state: "TX", country: "United States" },
  { code: "STL", name: "St. Louis Lambert International Airport", city: "St. Louis", state: "MO", country: "United States" },
  { code: "HOU", name: "William P. Hobby Airport", city: "Houston", state: "TX", country: "United States" },
  { code: "SMF", name: "Sacramento International Airport", city: "Sacramento", state: "CA", country: "United States" },
  { code: "SAT", name: "San Antonio International Airport", city: "San Antonio", state: "TX", country: "United States" },
  { code: "MCI", name: "Kansas City International Airport", city: "Kansas City", state: "MO", country: "United States" },
  { code: "RDU", name: "Raleigh-Durham International Airport", city: "Raleigh", state: "NC", country: "United States" },
  { code: "SJC", name: "San Jose Mineta International Airport", city: "San Jose", state: "CA", country: "United States" },
  { code: "CLE", name: "Cleveland Hopkins International Airport", city: "Cleveland", state: "OH", country: "United States" },
  { code: "PIT", name: "Pittsburgh International Airport", city: "Pittsburgh", state: "PA", country: "United States" },
  { code: "IND", name: "Indianapolis International Airport", city: "Indianapolis", state: "IN", country: "United States" },
  { code: "MSY", name: "Louis Armstrong New Orleans International Airport", city: "New Orleans", state: "LA", country: "United States" },
  { code: "CMH", name: "John Glenn Columbus International Airport", city: "Columbus", state: "OH", country: "United States" },
  { code: "RSW", name: "Southwest Florida International Airport", city: "Fort Myers", state: "FL", country: "United States" },
  { code: "OAK", name: "Oakland International Airport", city: "Oakland", state: "CA", country: "United States" },
  { code: "SNA", name: "John Wayne Airport", city: "Santa Ana / Orange County", state: "CA", country: "United States" },
  { code: "ABQ", name: "Albuquerque International Sunport", city: "Albuquerque", state: "NM", country: "United States" },
  { code: "PBI", name: "Palm Beach International Airport", city: "West Palm Beach", state: "FL", country: "United States" },
  { code: "ANC", name: "Ted Stevens Anchorage International Airport", city: "Anchorage", state: "AK", country: "United States" },
  { code: "OGG", name: "Kahului Airport", city: "Kahului / Maui", state: "HI", country: "United States" },
  { code: "MEM", name: "Memphis International Airport", city: "Memphis", state: "TN", country: "United States" },
  { code: "BUF", name: "Buffalo Niagara International Airport", city: "Buffalo", state: "NY", country: "United States" },
  { code: "SAV", name: "Savannah/Hilton Head International Airport", city: "Savannah", state: "GA", country: "United States" },
  { code: "CHS", name: "Charleston International Airport", city: "Charleston", state: "SC", country: "United States" },

  // International
  { code: "LHR", name: "London Heathrow Airport", city: "London", state: "England", country: "United Kingdom" },
  { code: "LGW", name: "London Gatwick Airport", city: "London", state: "England", country: "United Kingdom" },
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", state: "Île-de-France", country: "France" },
  { code: "ORY", name: "Paris Orly Airport", city: "Paris", state: "Île-de-France", country: "France" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", state: "Hesse", country: "Germany" },
  { code: "MUC", name: "Munich Airport", city: "Munich", state: "Bavaria", country: "Germany" },
  { code: "AMS", name: "Amsterdam Airport Schiphol", city: "Amsterdam", state: "North Holland", country: "Netherlands" },
  { code: "MAD", name: "Adolfo Suárez Madrid-Barajas Airport", city: "Madrid", state: "Community of Madrid", country: "Spain" },
  { code: "BCN", name: "Josep Tarradellas Barcelona-El Prat Airport", city: "Barcelona", state: "Catalonia", country: "Spain" },
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino Airport", city: "Rome", state: "Lazio", country: "Italy" },
  { code: "MXP", name: "Milan Malpensa Airport", city: "Milan", state: "Lombardy", country: "Italy" },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", state: "Zurich", country: "Switzerland" },
  { code: "VIE", name: "Vienna International Airport", city: "Vienna", state: "Lower Austria", country: "Austria" },
  { code: "DUB", name: "Dublin Airport", city: "Dublin", state: "Leinster", country: "Ireland" },
  { code: "EDI", name: "Edinburgh Airport", city: "Edinburgh", state: "Scotland", country: "United Kingdom" },
  { code: "MAN", name: "Manchester Airport", city: "Manchester", state: "England", country: "United Kingdom" },
  { code: "YYZ", name: "Toronto Pearson International Airport", city: "Toronto", state: "ON", country: "Canada" },
  { code: "YVR", name: "Vancouver International Airport", city: "Vancouver", state: "BC", country: "Canada" },
  { code: "YUL", name: "Montréal-Trudeau International Airport", city: "Montreal", state: "QC", country: "Canada" },
  { code: "YYC", name: "Calgary International Airport", city: "Calgary", state: "AB", country: "Canada" },
  { code: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", state: "NSW", country: "Australia" },
  { code: "MEL", name: "Melbourne Airport", city: "Melbourne", state: "VIC", country: "Australia" },
  { code: "DXB", name: "Dubai International Airport", city: "Dubai", state: "Dubai", country: "United Arab Emirates" },
  { code: "DOH", name: "Hamad International Airport", city: "Doha", state: "Doha", country: "Qatar" },
  { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", state: "", country: "Singapore" },
  { code: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", state: "Kanto", country: "Japan" },
  { code: "NRT", name: "Narita International Airport", city: "Tokyo", state: "Chiba", country: "Japan" },
  { code: "ICN", name: "Incheon International Airport", city: "Seoul", state: "Gyeonggi", country: "South Korea" },
  { code: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", state: "", country: "Hong Kong" },
  { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", state: "Samut Prakan", country: "Thailand" },
  { code: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", state: "Delhi", country: "India" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", state: "Maharashtra", country: "India" },
  { code: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", state: "Karnataka", country: "India" },
  { code: "MAA", name: "Chennai International Airport", city: "Chennai", state: "Tamil Nadu", country: "India" },
  { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", state: "Telangana", country: "India" },
  { code: "CCU", name: "Netaji Subhash Chandra Bose International Airport", city: "Kolkata", state: "West Bengal", country: "India" },
  { code: "COK", name: "Cochin International Airport", city: "Kochi", state: "Kerala", country: "India" },
  { code: "AMD", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", state: "Gujarat", country: "India" },
  { code: "GOI", name: "Dabolim Airport", city: "Goa", state: "Goa", country: "India" },
  { code: "GOX", name: "Manohar International Airport", city: "Mopa / Goa", state: "Goa", country: "India" },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", state: "Marmara", country: "Turkey" },
  { code: "MEX", name: "Mexico City International Airport", city: "Mexico City", state: "CDMX", country: "Mexico" },
  { code: "CUN", name: "Cancún International Airport", city: "Cancun", state: "Quintana Roo", country: "Mexico" },
  { code: "SJO", name: "Juan Santamaría International Airport", city: "San José", state: "Alajuela", country: "Costa Rica" },
  { code: "GRU", name: "São Paulo/Guarulhos International Airport", city: "São Paulo", state: "SP", country: "Brazil" },
  { code: "EZE", name: "Ministro Pistarini International Airport", city: "Buenos Aires", state: "BA", country: "Argentina" },
  { code: "JNB", name: "O. R. Tambo International Airport", city: "Johannesburg", state: "Gauteng", country: "South Africa" },
  { code: "CPT", name: "Cape Town International Airport", city: "Cape Town", state: "Western Cape", country: "South Africa" },
];

function searchAirportsAndHubs(query: string): FormattedPlace[] {
  const qLower = query.toLowerCase().trim();
  const qUpper = query.toUpperCase().trim();
  if (qLower.length < 2) return [];

  const matched: FormattedPlace[] = [];

  for (const apt of POPULAR_AIRPORTS_AND_HUBS) {
    const codeMatch = apt.code.startsWith(qUpper) || apt.code === qUpper;
    const cityMatch = apt.city.toLowerCase().includes(qLower);
    const nameMatch = apt.name.toLowerCase().includes(qLower);

    if (codeMatch || cityMatch || nameMatch) {
      const locPart = [apt.city, apt.state, apt.country].filter(Boolean).join(", ");
      const primary = `${apt.code} - ${apt.name}`;
      const secondary = locPart;
      const description = `${primary} (${secondary})`;

      matched.push({
        description,
        primary,
        secondary,
      });

      if (matched.length >= 8) break;
    }
  }

  return matched;
}

interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

function formatPhotonPlace(p: PhotonProperties): FormattedPlace {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions: FormattedPlace[] = [];
  const seen = new Set<string>();

  // 1. First priority: Match Airports & Travel Hubs
  const airportMatches = searchAirportsAndHubs(q);
  for (const item of airportMatches) {
    const key = item.description.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(item);
    }
  }

  // 2. Second priority: Geocoding via Photon OSM (if more results needed)
  if (suggestions.length < 6) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`,
        {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);

      if (photonRes.ok) {
        const data = await photonRes.json();
        if (Array.isArray(data.features)) {
          for (const f of data.features) {
            if (!f.properties) continue;
            const formatted = formatPhotonPlace(f.properties);
            const key = formatted.description.toLowerCase();
            if (formatted.description && !seen.has(key)) {
              seen.add(key);
              suggestions.push(formatted);
            }
          }
        }
      }
    } catch {
      // Fallback gracefully
    }
  }

  return NextResponse.json(
    { suggestions: suggestions.slice(0, 8) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    }
  );
}

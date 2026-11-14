// Curated towns with approximate centre coordinates. Used instead of a paid
// geocoding API so distances are deterministic and work offline.
// Northern Ireland is intentionally excluded: NI pharmacists register with
// PSNI, which the MVP does not model yet.
export type CountryCode = "IE" | "UK";

export interface Town {
  name: string;
  county: string;
  country: CountryCode;
  lat: number;
  lng: number;
}

export const TOWNS: Town[] = [
  { name: "Dublin", county: "Dublin", country: "IE", lat: 53.3498, lng: -6.2603 },
  { name: "Swords", county: "Dublin", country: "IE", lat: 53.4597, lng: -6.2181 },
  { name: "Bray", county: "Wicklow", country: "IE", lat: 53.2028, lng: -6.0983 },
  { name: "Naas", county: "Kildare", country: "IE", lat: 53.2159, lng: -6.6669 },
  { name: "Navan", county: "Meath", country: "IE", lat: 53.6528, lng: -6.6814 },
  { name: "Drogheda", county: "Louth", country: "IE", lat: 53.7179, lng: -6.3561 },
  { name: "Dundalk", county: "Louth", country: "IE", lat: 54.0, lng: -6.4167 },
  { name: "Cork", county: "Cork", country: "IE", lat: 51.8985, lng: -8.4756 },
  { name: "Galway", county: "Galway", country: "IE", lat: 53.2707, lng: -9.0568 },
  { name: "Limerick", county: "Limerick", country: "IE", lat: 52.6638, lng: -8.6267 },
  { name: "Waterford", county: "Waterford", country: "IE", lat: 52.2593, lng: -7.1101 },
  { name: "Kilkenny", county: "Kilkenny", country: "IE", lat: 52.6541, lng: -7.2448 },
  { name: "Wexford", county: "Wexford", country: "IE", lat: 52.3369, lng: -6.4633 },
  { name: "Carlow", county: "Carlow", country: "IE", lat: 52.8408, lng: -6.9261 },
  { name: "Portlaoise", county: "Laois", country: "IE", lat: 53.0344, lng: -7.2998 },
  { name: "Tullamore", county: "Offaly", country: "IE", lat: 53.2739, lng: -7.4889 },
  { name: "Athlone", county: "Westmeath", country: "IE", lat: 53.4239, lng: -7.9407 },
  { name: "Mullingar", county: "Westmeath", country: "IE", lat: 53.5259, lng: -7.3381 },
  { name: "Longford", county: "Longford", country: "IE", lat: 53.7276, lng: -7.7932 },
  { name: "Cavan", county: "Cavan", country: "IE", lat: 53.9908, lng: -7.3606 },
  { name: "Monaghan", county: "Monaghan", country: "IE", lat: 54.2492, lng: -6.9683 },
  { name: "Sligo", county: "Sligo", country: "IE", lat: 54.2766, lng: -8.4761 },
  { name: "Letterkenny", county: "Donegal", country: "IE", lat: 54.9566, lng: -7.7203 },
  { name: "Castlebar", county: "Mayo", country: "IE", lat: 53.8556, lng: -9.2988 },
  { name: "Roscommon", county: "Roscommon", country: "IE", lat: 53.6333, lng: -8.1833 },
  { name: "Ennis", county: "Clare", country: "IE", lat: 52.8436, lng: -8.9864 },
  { name: "Nenagh", county: "Tipperary", country: "IE", lat: 52.8619, lng: -8.1967 },
  { name: "Clonmel", county: "Tipperary", country: "IE", lat: 52.355, lng: -7.7039 },
  { name: "Tralee", county: "Kerry", country: "IE", lat: 52.2713, lng: -9.6999 },
  { name: "Killarney", county: "Kerry", country: "IE", lat: 52.0599, lng: -9.5044 },
  { name: "London", county: "Greater London", country: "UK", lat: 51.5072, lng: -0.1276 },
  { name: "Birmingham", county: "West Midlands", country: "UK", lat: 52.4862, lng: -1.8904 },
  { name: "Manchester", county: "Greater Manchester", country: "UK", lat: 53.4808, lng: -2.2426 },
  { name: "Liverpool", county: "Merseyside", country: "UK", lat: 53.4084, lng: -2.9916 },
  { name: "Leeds", county: "West Yorkshire", country: "UK", lat: 53.8008, lng: -1.5491 },
  { name: "Sheffield", county: "South Yorkshire", country: "UK", lat: 53.3811, lng: -1.4701 },
  { name: "Newcastle upon Tyne", county: "Tyne and Wear", country: "UK", lat: 54.9783, lng: -1.6178 },
  { name: "Nottingham", county: "Nottinghamshire", country: "UK", lat: 52.9548, lng: -1.1581 },
  { name: "Leicester", county: "Leicestershire", country: "UK", lat: 52.6369, lng: -1.1398 },
  { name: "Bristol", county: "Bristol", country: "UK", lat: 51.4545, lng: -2.5879 },
  { name: "Southampton", county: "Hampshire", country: "UK", lat: 50.9097, lng: -1.4044 },
  { name: "Cardiff", county: "Cardiff", country: "UK", lat: 51.4816, lng: -3.1791 },
  { name: "Glasgow", county: "Glasgow", country: "UK", lat: 55.8642, lng: -4.2518 },
  { name: "Edinburgh", county: "Edinburgh", country: "UK", lat: 55.9533, lng: -3.1883 },
];

export function townsFor(country: CountryCode): Town[] {
  return TOWNS.filter((t) => t.country === country);
}

export function findTown(name: string | null | undefined, country?: CountryCode): Town | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return TOWNS.find((t) => t.name.toLowerCase() === n && (!country || t.country === country));
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

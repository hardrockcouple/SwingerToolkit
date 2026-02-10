// clubs2-data.js
// Carrega JSON e normaliza (suporta o teu formato atual + um formato "novo" no futuro)

function txt(v) {
  return (v ?? "").toString().trim();
}

function yes(v) {
  const t = txt(v).toLowerCase();
  return t === "yes" || t === "y" || t === "true" || t === "1" || t === "x";
}

function slugify(s) {
  return txt(s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick(raw, keys) {
  for (const k of keys) {
    if (raw && Object.prototype.hasOwnProperty.call(raw, k)) {
      const v = raw[k];
      if (txt(v)) return txt(v);
    }
  }
  return "";
}

function toNumberEuroLike(v) {
  const s = txt(v);
  if (!s) return null;
  // "35,00 €" -> 35.00
  const cleaned = s
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(".", "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function normalizeClub(raw) {
  // Detecta se é formato "novo" (id/location/features/etc.)
  const isNew = raw && (raw.location || raw.features || raw.meta || raw.contact);

  if (isNew) {
    const name = txt(raw.name);
    const country = txt(raw.location?.country);
    const city = txt(raw.location?.city);

    return {
      id: txt(raw.id) || slugify(`${name}-${city}-${country}`) || crypto.randomUUID?.() || String(Math.random()),
      name,
      country,
      city,
      website: txt(raw.url),
      address: txt(raw.contact?.address),
      email: txt(raw.contact?.email),
      phone: txt(raw.contact?.phone),
      type: Array.isArray(raw.type) ? raw.type.map(txt).filter(Boolean) : (txt(raw.type) ? [txt(raw.type)] : []),
      visited: !!raw.meta?.visited,
      rating: raw.meta?.rating ?? null,
      interest: txt(raw.meta?.interest),
      notes: txt(raw.meta?.notes),
      pricing: raw.pricing || null,
      features: raw.features || null,
      geo: raw.geo || null,
      raw
    };
  }

  // Formato atual (o teu clubs.json)
  const name = pick(raw, ["name", "Name", "Nome", "club", "title"]);
  const country = pick(raw, ["country", "Country", "País", "Pais"]);
  const city = pick(raw, ["city", "City", "Cidade"]);

  // visited pode vir de: visited / Visitado / status / etc.
  const visited =
    yes(raw.visited) ||
    yes(raw.Visitado) ||
    yes(raw.status) ||
    txt(raw.Visitado).toLowerCase() === "visited";

  const website = pick(raw, ["website", "url", "site", "link"]);
  const address = pick(raw, ["address", "morada", "endereco", "endereço"]);
  const email = pick(raw, ["email", "e-mail"]);
  const phone = pick(raw, ["phone", "telefone", "tel"]);

  const ratingStars = pick(raw, ["Classificação", "classificacao", "rating"]);
  const rating = ratingStars ? ratingStars.replace(/[^*]/g, "").length || null : null;

  const interest = pick(raw, ["Interesse\nS | N | T", "interesse", "interest"]);

  const priceMin = toNumberEuroLike(pick(raw, ["price_couples_min"]));
  const priceMax = toNumberEuroLike(pick(raw, ["price_couples_max"]));
  const priceRange = pick(raw, ["price_range"]);

  // features booleanas (yes/no)
  const features = {
    sauna: yes(raw.has_sauna),
    pool: yes(raw.has_pool),
    darkroom: yes(raw.has_darkroom),
    privateRooms: yes(raw.has_private_rooms),
    lockers: yes(raw.has_lockers),
    bar: yes(raw.has_bar),
    outdoor: yes(raw.has_outdoor_area),
    dancefloor: yes(raw.has_dancefloor)
  };

  return {
    id: slugify(`${name}-${city}-${country}`) || crypto.randomUUID?.() || String(Math.random()),
    name,
    country,
    city,
    website,
    address,
    email,
    phone,
    type: txt(raw.type) ? [txt(raw.type)] : [],
    visited,
    rating,
    interest,
    notes: pick(raw, ["Obs Gerais", "notes", "notas", "obs"]),
    pricing: {
      currency: pick(raw, ["price_currency"]) || "EUR",
      couples: { min: priceMin, max: priceMax },
      range: priceRange || null,
      model: pick(raw, ["pricing_model"]) || null,
      notes: pick(raw, ["pricing_notes"]) || null
    },
    features,
    geo: {
      lat: txt(raw.lat) ? Number(txt(raw.lat)) : null,
      lng: txt(raw.lng) ? Number(txt(raw.lng)) : null
    },
    raw
  };
}

export async function loadClubsJson(jsonUrl) {
  const res = await fetch(jsonUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`JSON fetch failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];

  const clubs = data.map(normalizeClub).filter((c) => txt(c.name).length > 0);
  return clubs;
}

import {
  mockExperts,
  specializations,
  expertTypes,
  countryNames,
  languageNames,
  type ExpertProfile,
} from "./mock-data";

const DEALROOM_API_URL = process.env.DEALROOM_API_URL;
const DEALROOM_API_KEY = process.env.DEALROOM_API_KEY;

const useMock = !DEALROOM_API_URL || !DEALROOM_API_KEY;

export type { ExpertProfile };

export interface ExpertSearchParams {
  query?: string;
  specialization?: string;
  country?: string; // ISO 3166-1 alpha-2
  language?: string; // ISO 639-1
  expertType?: "technical" | "deployment";
  limit?: number;
  offset?: number;
}

export interface ExpertSearchResult {
  results: ExpertProfile[];
  total: number;
  offset: number;
}

// Legal experts are no longer offered through the directory. The Dealroom API
// guards this server-side; this client-side sanitizer is belt-and-braces so
// legal-only profiles are never rendered even if the upstream still returns them.
type RawExpertProfile = Omit<ExpertProfile, "expertTypes"> & {
  expertTypes: string[];
};

function sanitizeExpert(raw: RawExpertProfile): ExpertProfile | null {
  const expertTypes = raw.expertTypes.filter(
    (t): t is ExpertProfile["expertTypes"][number] =>
      t === "technical" || t === "deployment"
  );
  if (expertTypes.length === 0) return null; // legal-only expert: excluded
  return { ...raw, expertTypes };
}

function filterMockExperts(params: ExpertSearchParams): ExpertSearchResult {
  let results = [...mockExperts];

  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(
      (e) =>
        (e.name?.toLowerCase().includes(q) ?? false) ||
        (e.firm?.toLowerCase().includes(q) ?? false) ||
        (e.bio?.toLowerCase().includes(q) ?? false) ||
        e.specializations.some((s) => s.toLowerCase().includes(q))
    );
  }

  if (params.specialization) {
    results = results.filter((e) =>
      e.specializations.some(
        (s) => s.toLowerCase() === params.specialization!.toLowerCase()
      )
    );
  }

  if (params.country) {
    results = results.filter(
      (e) =>
        e.location.country?.toLowerCase() === params.country!.toLowerCase()
    );
  }

  if (params.language) {
    results = results.filter((e) =>
      e.languages.some(
        (l) => l.toLowerCase() === params.language!.toLowerCase()
      )
    );
  }

  if (params.expertType) {
    results = results.filter((e) => e.expertTypes.includes(params.expertType!));
  }

  // Sort by profileCompleteness descending (best profiles first)
  results.sort((a, b) => b.profileCompleteness - a.profileCompleteness);

  const total = results.length;
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  results = results.slice(offset, offset + limit);

  return { results, total, offset };
}

export async function searchExperts(
  params: ExpertSearchParams
): Promise<ExpertSearchResult> {
  if (useMock) {
    return filterMockExperts(params);
  }

  try {
    const res = await fetch(`${DEALROOM_API_URL}/api/v1/experts/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEALROOM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: params.query,
        specialization: params.specialization,
        country: params.country,
        language: params.language,
        expertType: params.expertType,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
      }),
      next: { revalidate: 300 }, // 5-minute cache
    });

    if (!res.ok) {
      console.error("Dealroom search failed:", res.status);
      return filterMockExperts(params);
    }

    const data = (await res.json()) as {
      results: RawExpertProfile[];
      total: number;
      offset: number;
    };
    const results = data.results
      .map(sanitizeExpert)
      .filter((e): e is ExpertProfile => e !== null);
    return {
      results,
      total: data.total - (data.results.length - results.length),
      offset: data.offset,
    };
  } catch (err) {
    console.error("Dealroom search error:", err);
    return filterMockExperts(params);
  }
}

export async function getExpertById(
  id: string
): Promise<ExpertProfile | null> {
  if (useMock) {
    return mockExperts.find((e) => e.id === id) ?? null;
  }

  try {
    const res = await fetch(`${DEALROOM_API_URL}/api/v1/experts/${id}`, {
      headers: {
        Authorization: `Bearer ${DEALROOM_API_KEY}`,
      },
      next: { revalidate: 3600 }, // 1-hour cache
    });

    if (!res.ok) {
      return mockExperts.find((e) => e.id === id) ?? null;
    }

    return sanitizeExpert((await res.json()) as RawExpertProfile);
  } catch (err) {
    console.error("Dealroom getExpertById error:", err);
    return mockExperts.find((e) => e.id === id) ?? null;
  }
}

// --- Filter data (fetched from Dealroom API or mock fallback) ---

interface RemoteFilters {
  specializations: string[];
  countries: string[];
  languages: string[];
  expertTypes: string[];
}

async function fetchRemoteFilters(): Promise<RemoteFilters | null> {
  if (useMock) return null;

  try {
    const res = await fetch(`${DEALROOM_API_URL}/api/v1/experts/filters`, {
      headers: {
        Authorization: `Bearer ${DEALROOM_API_KEY}`,
      },
      next: { revalidate: 300 }, // 5-minute cache
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getSpecializations(): Promise<string[]> {
  const remote = await fetchRemoteFilters();
  return remote?.specializations ?? specializations;
}

export async function getCountries(): Promise<{ code: string; name: string }[]> {
  const remote = await fetchRemoteFilters();

  if (remote) {
    return remote.countries
      .map((code) => ({ code, name: countryNames[code] ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Mock fallback
  const codes = [
    ...new Set(
      mockExperts
        .map((e) => e.location.country)
        .filter((c): c is string => c != null)
    ),
  ].sort();
  return codes.map((code) => ({
    code,
    name: countryNames[code] ?? code,
  }));
}

export async function getLanguages(): Promise<{ code: string; name: string }[]> {
  const remote = await fetchRemoteFilters();

  if (remote) {
    return remote.languages
      .map((code) => ({ code, name: languageNames[code] ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Mock fallback
  const codes = [
    ...new Set(mockExperts.flatMap((e) => e.languages)),
  ].sort();
  return codes.map((code) => ({
    code,
    name: languageNames[code] ?? code,
  }));
}

export async function getExpertTypes() {
  const remote = await fetchRemoteFilters();

  if (remote) {
    const typeLabels: Record<string, string> = {
      technical: "Technical",
      deployment: "Deployment",
    };
    return remote.expertTypes
      .filter((value) => value !== "legal")
      .map((value) => ({
        value,
        label: typeLabels[value] ?? value,
      }));
  }

  return [...expertTypes];
}

// --- Expert contact requests (Dealroom API v1) ---

export interface ContactExpertParams {
  expertId: string;
  requesterName: string;
  requesterEmail: string;
  requesterCompany?: string;
  subject: string;
  message?: string;
  governingLaw?: string;
}

export interface ContactRequestResult {
  requestId: string;
  status: string;
  createdAt: string;
}

export interface ContactRequestDetails {
  requestId: string;
  expertId: string;
  expertName: string | null;
  subject: string;
  status: string;
  message: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterCompany: string | null;
  governingLaw: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export async function contactExpert(
  params: ContactExpertParams
): Promise<ContactRequestResult> {
  if (useMock) {
    // In mock mode, simulate a successful request
    return {
      requestId: `mock-req-${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  const res = await fetch(
    `${DEALROOM_API_URL}/api/v1/experts/${params.expertId}/contact`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEALROOM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requesterName: params.requesterName,
        requesterEmail: params.requesterEmail,
        requesterCompany: params.requesterCompany,
        subject: params.subject,
        message: params.message,
        governingLaw: params.governingLaw,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Contact request failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getContactRequest(
  requestId: string
): Promise<ContactRequestDetails> {
  if (useMock) {
    throw new Error("Contact request lookup not available in mock mode");
  }

  const res = await fetch(
    `${DEALROOM_API_URL}/api/v1/experts/requests/${requestId}`,
    {
      headers: {
        Authorization: `Bearer ${DEALROOM_API_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request lookup failed (${res.status}): ${text}`);
  }

  return res.json();
}

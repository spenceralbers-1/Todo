export const fetchIcs = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch ICS");
  }
  return response.text();
};

export const fetchIcsWithProxy = async (url: string) => {
  // Prefer proxy to avoid CORS and cookie issues on calendar hosts.
  const proxyUrl = `/api/ics-proxy?url=${encodeURIComponent(url)}`;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error("Failed via proxy");
    }
    return await response.text();
  } catch (proxyError) {
    // Fallback: direct fetch in environments that allow it.
    return fetchIcs(url);
  }
};

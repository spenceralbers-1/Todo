export const fetchIcs = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch ICS");
  }
  return response.text();
};

export const fetchIcsWithProxy = async (url: string) => {
  try {
    return await fetchIcs(url);
  } catch (error) {
    // Fall back to proxy on CORS/network errors.
  }

  const proxyUrl = `/api/ics-proxy?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch ICS via proxy");
  }
  return response.text();
};

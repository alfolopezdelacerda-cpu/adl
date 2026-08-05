// Sustituye a window.storage (API interna de artefactos de Claude.ai) por un
// backend real en Vercel Blob, compartido entre todos los que abren la app.
type StorageResult = { value: string } | null;

export const storage = {
  async get(key: string, _shared?: boolean): Promise<StorageResult> {
    const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.value === null || data.value === undefined) return null;
    return { value: data.value };
  },
  async set(key: string, value: string, _shared?: boolean): Promise<void> {
    await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
export interface ActivityRecord { id?: string; _id?: string; type: string; status: string; summary?: string; createdAt: string; details?: Record<string, unknown> }
export async function listActivity(): Promise<ActivityRecord[]> {
  const response = await fetch(`${API}/activity`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Couldn't load activity history");
  return (await response.json()).payload ?? [];
}

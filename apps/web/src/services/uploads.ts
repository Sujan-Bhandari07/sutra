const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function uploadAttachment(file: File): Promise<{ id: string; url: string; contentType: string; filename: string; size: number }> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API}/uploads`, { method: "POST", credentials: "include", body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "Image upload failed");
  return result.payload;
}

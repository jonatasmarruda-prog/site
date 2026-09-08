import type { Config } from "@netlify/functions";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ ok:false, message:"Método não permitido." }, 405);

  const webhook = (Netlify.env.get("TRILHEIROS_SHEETS_WEBHOOK") || "").trim();
  if (!webhook) return json({ ok:true, configured:false, synced:false });

  const payload = await req.json().catch(() => null) as any;
  if (!payload?.id || !payload?.title) return json({ ok:false, message:"Dados incompletos." }, 400);

  const rawRow = {
    id: String(payload.id),
    createdAt: String(payload.createdAt || ""),
    title: String(payload.title || ""),
    adventureDate: String(payload.adventureDate || ""),
    description: String(payload.description || ""),
    photoKey: String(payload.photoKey || ""),
    photoHash: String(payload.photoHash || "")
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawRow),
      signal: controller.signal
    });
    if (!response.ok) return json({ ok:false, configured:true, synced:false }, 502);
    return json({ ok:true, configured:true, synced:true });
  } catch {
    return json({ ok:false, configured:true, synced:false }, 502);
  } finally {
    clearTimeout(timeout);
  }
};

export const config: Config = { path: "/api/sheet-append" };
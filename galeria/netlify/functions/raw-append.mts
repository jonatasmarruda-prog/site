import type { Config } from "@netlify/functions";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function text(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ ok:false, message:"Método não permitido." }, 405);

  const webhook = (Netlify.env.get("TRILHEIROS_RAW_SHEETS_WEBHOOK") || "").trim();
  if (!webhook) return json({ ok:true, configured:false, synced:false });

  let body: any;
  try { body = await req.json(); }
  catch { return json({ ok:false, message:"Dados inválidos." }, 400); }

  const row = {
    action: "append-row",
    postId: text(body?.postId, 80),
    createdAt: text(body?.createdAt, 40),
    participantName: text(body?.participantName, 60),
    location: text(body?.location, 90),
    adventureDate: text(body?.adventureDate, 10),
    description: text(body?.description, 320),
    rating: Number(body?.rating) || 0,
    photoKey: text(body?.photoKey, 120)
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      signal: controller.signal
    });
    return json({ ok:true, configured:true, synced:response.ok }, response.ok ? 200 : 502);
  } catch {
    return json({ ok:false, configured:true, synced:false }, 502);
  } finally {
    clearTimeout(timeout);
  }
};

export const config: Config = { path: "/api/raw-append" };
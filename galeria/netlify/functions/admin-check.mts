import type { Config } from "@netlify/functions";

const MASTER_PASSWORD_HASH = "091a4bc4f78aa6a356f0ffdbd1ebe4862a285ed0e26d67ecd9b550527fc608df";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value.trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async (req: Request) => {
  if (req.method !== "GET") return json({ ok:false, message:"Método não permitido." }, 405);

  const provided = (req.headers.get("x-admin-key") || "").trim();
  if (!provided) return json({ ok:false, message:"Digite a senha do administrador." }, 401);

  const configured = (Netlify.env.get("TRILHEIROS_ADMIN_KEY") || "").trim();
  const validConfigured = Boolean(configured && provided === configured);
  const validMaster = (await sha256(provided)) === MASTER_PASSWORD_HASH;

  if (!validConfigured && !validMaster) return json({ ok:false, message:"Senha de administrador incorreta." }, 401);
  return json({ ok:true });
};

export const config: Config = { path: "/api/admin-check" };
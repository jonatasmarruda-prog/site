import type { Config } from "@netlify/functions";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default async (req: Request) => {
  if (req.method !== "GET") return json({ ok:false, message:"Método não permitido." }, 405);

  const provided = (req.headers.get("x-admin-key") || "").trim();
  const expected = (Netlify.env.get("TRILHEIROS_ADMIN_KEY") || "").trim();

  if (!expected) return json({ ok:false, message:"Chave administrativa não configurada." }, 503);
  if (!provided || provided !== expected) return json({ ok:false, message:"Chave de administrador incorreta." }, 401);

  return json({ ok:true });
};

export const config: Config = { path: "/api/admin-check" };

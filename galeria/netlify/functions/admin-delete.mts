import type { Config } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";

const MASTER_PASSWORD_HASH = "091a4bc4f78aa6a356f0ffdbd1ebe4862a285ed0e26d67ecd9b550527fc608df";

function store(name: string) {
  return Netlify.context?.deploy.context === "production"
    ? getStore(name, { consistency: "strong" })
    : getDeployStore(name);
}

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

async function isAdmin(provided: string) {
  const current = (Netlify.env.get("TRILHEIROS_ADMIN_KEY") || "").trim();
  if (current && provided === current) return true;
  return (await sha256(provided)) === MASTER_PASSWORD_HASH;
}

export default async (req: Request) => {
  if (req.method !== "DELETE") return json({ message: "Método não permitido." }, 405);

  const provided = (req.headers.get("x-admin-key") || "").trim();
  if (!provided || !(await isAdmin(provided))) return json({ message: "Acesso de administrador inválido." }, 401);

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return json({ message: "Publicação não informada." }, 400);

  const posts = store("trilheiros-gallery-posts");
  const media = store("trilheiros-gallery-media");
  const { blobs } = await posts.list({ prefix: "post-" });
  const target = blobs.find(item => item.key.endsWith(`-${id}`));
  if (!target) return json({ message: "Publicação não encontrada." }, 404);

  const post = await posts.get(target.key, { type: "json" }) as any;
  await posts.delete(target.key);
  if (post?.photoKey) await media.delete(post.photoKey);

  return json({ ok: true });
};

export const config: Config = { path: "/api/admin-delete" };
import type { Context, Config } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";

const PROFANITY = [
  "porra","caralho","merda","bosta","puta","puto","fdp","foda","foder","cacete",
  "desgraca","vai tomar no cu","tomar no cu","cuzao","arrombado","idiota","imbecil",
  "burro","otario","babaca","vagabundo","vagabunda"
];

const NEGATIVE = [
  "nao gostei","nao recomendo","nunca mais","foi pessimo","foi horrivel","muito ruim",
  "horrivel","pessimo","terrivel","decepcao","decepcionante","mal organizado","desorganizado",
  "bagunca","lixo","ridiculo","vergonha","absurdo","enganacao","fraude","golpe",
  "atendimento ruim","organizacao ruim","nao vale","arrependi","arrependimento","odiei","detestei"
];

function normalizeText(text = "") {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[0@]/g, "o").replace(/[1!]/g, "i").replace(/[3]/g, "e")
    .replace(/[4]/g, "a").replace(/[5$]/g, "s")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function moderate(text: string) {
  const n = normalizeText(text);
  if (PROFANITY.some(term => n.includes(normalizeText(term)))) {
    return "A mensagem contém linguagem ofensiva. Ajuste o texto para publicar na galeria.";
  }
  if (NEGATIVE.some(term => n.includes(normalizeText(term)))) {
    return "A mensagem foi identificada como negativa ou depreciativa. Conte sua experiência de forma respeitosa e positiva para publicar.";
  }
  const attacks = [
    /\b(eles|voces|organizador|guia|grupo)\b.{0,30}\b(ruim|pessim|horrivel|incompetente|desorganizado|ridiculo)\b/i,
    /\b(reclamo|reclamacao)\b/i
  ];
  if (attacks.some(r => r.test(n))) {
    return "A mensagem parece conter ataque ou reclamação. Reescreva de forma respeitosa e positiva para publicar.";
  }
  return "";
}

function blobStore(name: string) {
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

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export default async (req: Request, context: Context) => {
  const posts = blobStore("trilheiros-gallery-posts");
  const media = blobStore("trilheiros-gallery-media");

  if (req.method === "GET") {
    const { blobs } = await posts.list({ prefix: "post-" });
    const latest = blobs.sort((a,b) => b.key.localeCompare(a.key)).slice(0, 80);
    const values = await Promise.all(latest.map(item => posts.get(item.key, { type: "json" })));
    return json({ posts: values.filter(Boolean) });
  }

  if (req.method === "DELETE") {
    const adminKey = req.headers.get("x-admin-key") || "";
    const expected = Netlify.env.get("TRILHEIROS_ADMIN_KEY") || "";
    if (!expected || adminKey !== expected) {
      return json({ message: "Acesso de administrador inválido." }, 401);
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    if (!id) return json({ message: "Publicação não informada." }, 400);

    const { blobs } = await posts.list({ prefix: "post-" });
    const target = blobs.find(item => item.key.endsWith(`-${id}`));
    if (!target) return json({ message: "Publicação não encontrada." }, 404);

    const post = await posts.get(target.key, { type: "json" }) as any;
    await posts.delete(target.key);
    if (post?.photoKey) await media.delete(post.photoKey);
    return json({ ok: true });
  }

  if (req.method !== "POST") return json({ message: "Método não permitido." }, 405);

  const form = await req.formData();
  if (clean(form.get("website"), 200)) return json({ message: "Publicação recusada." }, 400);

  const name = clean(form.get("name"), 50);
  const trip = clean(form.get("trip"), 70);
  const description = clean(form.get("description"), 360);
  const caption = clean(form.get("caption"), 600);
  const photo = form.get("photo");

  if (!name || !trip || !description) return json({ message: "Preencha nome, passeio e descrição." }, 400);
  if (!(photo instanceof File) || !photo.type.startsWith("image/")) return json({ message: "Envie uma foto válida." }, 400);
  if (photo.size > 5 * 1024 * 1024) return json({ message: "A foto ficou muito grande. Escolha outra imagem." }, 413);

  const blocked = moderate([name, trip, description, caption].join(" "));
  if (blocked) return json({ code: "moderation", message: blocked }, 422);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const photoKey = `photo-${id}.jpg`;

  await media.set(photoKey, await photo.arrayBuffer());

  const post = { id, name, trip, description, caption, photoKey, createdAt };
  const sortable = createdAt.replace(/\D/g, "").slice(0, 17);
  await posts.setJSON(`post-${sortable}-${id}`, post);

  return json({ ok: true, post }, 201);
};

export const config: Config = { path: "/api/posts" };

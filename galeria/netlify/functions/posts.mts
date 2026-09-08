import type { Context, Config } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";

const MASTER_PASSWORD_HASH = "091a4bc4f78aa6a356f0ffdbd1ebe4862a285ed0e26d67ecd9b550527fc608df";

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

async function hashBytes(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashText(value: string) {
  return hashBytes(new TextEncoder().encode(value.trim()).buffer);
}

async function isAdmin(provided: string) {
  const configured = (Netlify.env.get("TRILHEIROS_ADMIN_KEY") || "").trim();
  if (configured && provided === configured) return true;
  return (await hashText(provided)) === MASTER_PASSWORD_HASH;
}

function legacyHash(post: any) {
  if (post?.photoHash) return String(post.photoHash);
  const match = String(post?.caption || "").match(/\|hash:([a-f0-9]{64})$/i);
  return match?.[1] || "";
}

async function appendAdministrativeRow(post: any) {
  const webhook = (Netlify.env.get("TRILHEIROS_SHEETS_WEBHOOK") || "").trim();
  if (!webhook) return { configured:false, synced:false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: post.id,
        createdAt: post.createdAt,
        title: post.title,
        adventureDate: post.adventureDate,
        description: post.description,
        photoKey: post.photoKey,
        photoHash: post.photoHash
      }),
      signal: controller.signal
    });
    return { configured:true, synced:response.ok };
  } catch {
    return { configured:true, synced:false };
  } finally {
    clearTimeout(timeout);
  }
}

export default async (req: Request, context: Context) => {
  const posts = blobStore("trilheiros-gallery-posts");
  const media = blobStore("trilheiros-gallery-media");

  if (req.method === "GET") {
    const { blobs } = await posts.list({ prefix: "post-" });
    const latest = blobs.sort((a,b) => b.key.localeCompare(a.key)).slice(0, 120);
    const values = await Promise.all(latest.map(item => posts.get(item.key, { type: "json" })));
    return json({ posts: values.filter(Boolean) });
  }

  if (req.method === "DELETE") {
    const adminKey = (req.headers.get("x-admin-key") || "").trim();
    if (!adminKey || !(await isAdmin(adminKey))) {
      return json({ message: "Acesso de administrador inválido." }, 401);
    }

    const id = new URL(req.url).searchParams.get("id") || "";
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

  const legacyName = clean(form.get("name"), 50);
  const legacyTrip = clean(form.get("trip"), 80);
  const title = clean(form.get("title"), 80) || legacyTrip;
  const adventureDate = clean(form.get("adventureDate"), 10);
  const description = clean(form.get("description"), 280);
  const caption = clean(form.get("caption"), 600);
  const photo = form.get("photo");

  if (!title) return json({ message: "Digite o título da aventura." }, 400);
  if (!(photo instanceof File) || !photo.type.startsWith("image/")) return json({ message: "Envie uma foto válida." }, 400);
  if (photo.size > 5 * 1024 * 1024) return json({ message: "A foto ficou muito grande. Escolha outra imagem." }, 413);

  const blocked = moderate([title, description].join(" "));
  if (blocked) return json({ code: "moderation", message: blocked }, 422);

  const photoBytes = await photo.arrayBuffer();
  const photoHash = await hashBytes(photoBytes);

  const { blobs: existingKeys } = await posts.list({ prefix: "post-" });
  const existingPosts = await Promise.all(existingKeys.map(item => posts.get(item.key, { type: "json" })));
  if (existingPosts.some(post => post && legacyHash(post) === photoHash)) {
    return json({ code:"duplicate", message:"Esta foto já foi publicada na galeria." }, 409);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const photoKey = `photo-${id}.jpg`;
  await media.set(photoKey, photoBytes);

  const post = {
    id,
    title,
    adventureDate,
    description,
    photoKey,
    photoHash,
    createdAt,
    name: legacyName,
    trip: legacyTrip || title,
    caption
  };

  const sortable = createdAt.replace(/\D/g, "").slice(0, 17);
  await posts.setJSON(`post-${sortable}-${id}`, post);

  const sheet = await appendAdministrativeRow(post);
  return json({ ok:true, post, sheet }, 201);
};

export const config: Config = { path: "/api/posts" };

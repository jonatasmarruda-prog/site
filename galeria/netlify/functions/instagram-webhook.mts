import type { Context, Config } from "@netlify/functions";

const USERNAME = "trilheiros.roomt";

function env(name: string) {
  return Netlify.env.get(name) || "";
}

function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pick(items: string[], seed = "") {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return items[hash % items.length];
}

function detectTrip(caption = "") {
  const text = normalize(caption);
  const trips: Array<[string, string]> = [
    ["morro da mesa", "Morro da Mesa"],
    ["salto das nuvens", "Salto das Nuvens"],
    ["outubro rosa", "Trilha Outubro Rosa"],
    ["morro do carneiro", "Morro do Carneiro"],
    ["trilha kids", "Trilha Kids"],
    ["nobres", "Nobres / Bom Jardim"],
    ["rafting", "Rafting"],
    ["rio cristalino", "Rio Cristalino"],
    ["canion das indias", "Cânion das Índias"],
    ["barra do garcas", "Barra do Garças"],
    ["chapada dos guimaraes", "Chapada dos Guimarães"],
    ["mirante da janela", "Mirante da Janela"],
  ];

  for (const [key, label] of trips) {
    if (text.includes(key)) return label;
  }
  return "esse passeio";
}

function money(caption = "") {
  return [...new Set(caption.match(/R\$\s?[\d\.]+(?:,\d{2})?/gi) || [])].slice(0, 4);
}

function dateOf(caption = "") {
  const match = caption.match(
    /\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/iu,
  );
  return match?.[0] || "";
}

function times(caption = "") {
  return [...new Set(caption.match(/\b\d{1,2}(?::\d{2})?\s?h(?:oras?)?\b/gi) || [])].slice(0, 3);
}

function childInfo(caption = "") {
  return (
    caption
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /crian|idade|minim|anos/i.test(line)) || ""
  );
}

function isSoldOut(caption = "") {
  return /esgotad|lotad|sem vagas|vagas encerradas/.test(normalize(caption));
}

function cta(seed = "") {
  return pick(
    [
      "Quer mais detalhes? Chama a gente no Direct 😊",
      "Para ver todas as informações, acesse a Agenda dos Trilheiros no link da bio 🥾🌿",
      "Se quiser reservar ou tirar mais dúvidas, chama a gente no Direct 😊",
      "Confira a Agenda dos Trilheiros no link da bio e venha viver essa experiência com a gente! 🌿🥾",
      "Ficou com alguma dúvida? Chama no Direct ou confira a agenda completa no link da bio 😉",
    ],
    seed,
  );
}

function buildReply(commentId: string, commentText: string, caption: string) {
  const question = normalize(commentText);
  const trip = detectTrip(caption);
  const ending = cta(commentId + commentText);
  const values = money(caption);
  const date = dateOf(caption);
  const hours = times(caption);
  const child = childInfo(caption);

  if (/\b(valor|preco|quanto|custa|pix|cartao)\b/.test(question)) {
    return values.length
      ? `😊 Sobre ${trip}: os valores informados são ${values.join(" / ")}. ${ending}`
      : `😊 Os valores de ${trip} estão na Agenda dos Trilheiros. ${ending}`;
  }

  if (/\b(vaga|vagas|tem vaga|ainda tem|disponivel)\b/.test(question)) {
    return isSoldOut(caption)
      ? `As vagas de ${trip} estão encerradas no momento. 🌿 Confira outros passeios na Agenda dos Trilheiros no link da bio.`
      : `Sim 😊 As reservas para ${trip} estão abertas. ${ending}`;
  }

  if (/\b(data|dia|quando)\b/.test(question)) {
    return date
      ? `📅 ${trip} está programado para ${date}. ${ending}`
      : `📅 Confira a data de ${trip} na Agenda dos Trilheiros no link da bio. ${ending}`;
  }

  if (/\b(horario|saida|retorno|que horas)\b/.test(question)) {
    return hours.length
      ? `⏰ Os horários informados para ${trip} são ${hours.join(" / ")}. ${ending}`
      : `⏰ Confira os horários de ${trip} na Agenda dos Trilheiros. ${ending}`;
  }

  if (/\b(crianca|criancas|idade|anos|menor)\b/.test(question)) {
    return child
      ? `👧👦 Sobre idade/crianças em ${trip}: ${child}. ${ending}`
      : `👧👦 Confira as regras de idade de ${trip} na Agenda dos Trilheiros. ${ending}`;
  }

  if (/\b(guia|responsavel|quem e o guia)\b/.test(question)) {
    return `🥾 O responsável pelos Trilheiros de Rondonópolis é Jonatas Marruda, Guia/Condutor de Turismo. ${ending}`;
  }

  if (/\b(quero ir|quero participar|como participar|como faco|reservar|reserva|inscricao|eu quero|bora)\b/.test(question)) {
    return `Bora! 😍 As reservas para ${trip} estão abertas. ${ending}`;
  }

  if (/lindo|maravilh|top|show|amei|incrivel|sensacional|parabens|👏|❤️|😍/.test(question)) {
    return `${pick(["Muito obrigado! 😍", "Que bom que gostou! 💚", "Valeu demais! 🥾🌿", "Ficamos felizes que tenha curtido! 😍"], commentId)} Confira a Agenda dos Trilheiros no link da bio e acompanhe os próximos passeios.`;
  }

  return `Oi! 😊 Sobre ${trip}, a gente te ajuda sim. ${ending}`;
}

async function graph(path: string, init: RequestInit = {}) {
  const accessToken = env("META_ACCESS_TOKEN");
  if (!accessToken) throw new Error("META_ACCESS_TOKEN não configurado");

  const version = env("META_GRAPH_VERSION") || "v24.0";
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  url.searchParams.set("access_token", accessToken);

  return fetch(url, init);
}

async function getCaption(mediaId: string) {
  if (!mediaId) return "";
  const response = await graph(`${mediaId}?fields=caption`);
  if (!response.ok) return "";
  const data = await response.json();
  return data.caption || "";
}

async function alreadyAnswered(commentId: string) {
  const response = await graph(`${commentId}?fields=replies{username,text}`);
  if (!response.ok) return false;
  const data = await response.json();
  return (data.replies?.data || []).some(
    (reply: { username?: string }) => normalize(reply.username || "") === USERNAME,
  );
}

async function postReply(commentId: string, message: string) {
  const response = await graph(`${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message }),
  });

  if (!response.ok) {
    throw new Error(`Meta ${response.status}: ${await response.text()}`);
  }
}

function extractEvents(payload: any) {
  const output: Array<{
    id: string;
    text: string;
    username: string;
    mediaId: string;
    parentId: string;
  }> = [];

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field !== "comments") continue;
      const value = change.value || {};
      const id = value.id || value.comment_id;
      if (!id) continue;

      output.push({
        id,
        text: value.text || "",
        username: value.from?.username || value.username || "",
        mediaId: value.media?.id || value.media_id || "",
        parentId: value.parent_id || value.parent?.id || "",
      });
    }
  }

  return output;
}

export default async (request: Request, context: Context) => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (url.searchParams.get("health") === "1") {
      return new Response(
        JSON.stringify({
          ok: true,
          verifyTokenConfigured: Boolean(env("META_VERIFY_TOKEN")),
          accessTokenConfigured: Boolean(env("META_ACCESS_TOKEN")),
          graphVersion: env("META_GRAPH_VERSION") || "v24.0",
        }),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } },
      );
    }

    if (
      mode === "subscribe" &&
      env("META_VERIFY_TOKEN") &&
      token === env("META_VERIFY_TOKEN")
    ) {
      return new Response(challenge || "", { status: 200 });
    }

    return new Response("Webhook verification failed", { status: 403 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const events = extractEvents(payload).slice(0, 5);

  context.waitUntil(
    (async () => {
      for (const event of events) {
        try {
          if (event.parentId) continue;
          if (!event.text.trim()) continue;
          if (normalize(event.username) === USERNAME) continue;
          if (await alreadyAnswered(event.id)) continue;

          const caption = await getCaption(event.mediaId);
          const reply = buildReply(event.id, event.text, caption);
          await postReply(event.id, reply);
        } catch (error) {
          console.error("instagram-auto-reply", event.id, error);
        }
      }
    })(),
  );

  return new Response("EVENT_RECEIVED", { status: 200 });
};

export const config: Config = {
  path: "/instagram/webhook",
};

import type { Context, Config } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";
function store(name:string){const c=(globalThis as any).Netlify?.context?.deploy?.context;return c==="production"?getStore(name,{consistency:"strong"}):getDeployStore(name)}
export default async(req:Request,context:Context)=>{if(req.method!=="GET")return new Response("Método não permitido",{status:405});const u=new URL(req.url),id=u.searchParams.get("id")||"";if(!/^photo-[a-z0-9-]+\.jpg$/i.test(id))return new Response("Foto inválida",{status:400});const data=await store("trilheiros-gallery-media").get(id,{type:"arrayBuffer"});if(!data)return new Response("Foto não encontrada",{status:404});return new Response(data,{headers:{"Content-Type":"image/jpeg","Cache-Control":"public, max-age=31536000, immutable"}})};
export const config:Config={path:"/api/photo"};

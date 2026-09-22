// Public-reference metadata ingestion for Cornerstone visual boards.
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sourceFor(value){try{const host=new URL(value).hostname.toLowerCase().replace(/^www\./,"");if(host.endsWith("pinterest.com")||host==="pin.it")return"pinterest";if(host.endsWith("vinted.co.uk")||host.endsWith("vinted.com")||host.includes("vinted."))return"vinted";if(host.endsWith("depop.com"))return"depop";}catch{}return"other";}
function clean(value){return String(value||"").replace(/\s+/g," ").trim();}
function meta(html,key,attr){const safe=String(key).replace(/[^a-zA-Z0-9_-]/g,"");const attribute=attr||"property";const re=new RegExp("<meta[^>]+(?:"+attribute+"=[\\\"']"+safe+"[\\\"'][^>]+content=[\\\"']([^\\\"']+)[\\\"']|content=[\\\"']([^\\\"']+)[\\\"'][^>]+"+attribute+"=[\\\"']"+safe+"[\\\"'])[^>]*>","i");const m=String(html||"").match(re);return clean(m&&(m[1]||m[2]));}
function jsonLd(html){const scripts=Array.from(String(html||"").matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);const out=[];for(const m of scripts){try{const parsed=JSON.parse(m[1].trim());Array.isArray(parsed)?out.push(...parsed):out.push(parsed);}catch{}}return out;}
function firstImage(value){if(!value)return"";if(typeof value==="string")return value;if(Array.isArray(value)){for(const x of value){const f=firstImage(x);if(f)return f;}return"";}if(typeof value==="object")return String(value.url||value.contentUrl||value.image||"").trim();return"";}
function classify(text){const v=String(text||"").toLowerCase();if(/mirror|selfie|pose|posing|standing|walking|seated|sitting|over[- ]shoulder|outfit check|grwm/.test(v))return"pose";if(/dress|trouser|jean|denim|coat|jacket|blazer|skirt|top|shirt|knit|hoodie|cardigan|boots|sneaker|loafer|bag|leather|silk|cotton|wool/.test(v))return"wardrobe";if(/cafe|kitchen|bedroom|hotel|street|gym|beach|terrace|desk|office|travel|restaurant|bathroom/.test(v))return"scene";if(/earring|necklace|bracelet|watch|ring|sunglasses|belt|scarf/.test(v))return"accessory";return"mixed";}
function recipe(source,title,description){return{category:classify([title,description].join(" ")),source,inspiration_mode:"structure_only",wardrobe:{silhouette:"",garments:[],materials:[],colours:[],fit:"",details:""},pose:{family:"",geometry:"",crop:"",gaze:"",hands:""},environment:{setting:"",lived_in_details:[],lighting:""},composition:{camera_height:"",perspective:"",framing:"",subject_position:""},instruction:"Use this reference for visual structure only. Preserve the selected Cornerstone creator identity and produce an original scene."};}
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)return res.status(500).json({error:"Supabase is not configured."});
 const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"").trim();if(!token)return res.status(401).json({error:"Sign in is required."});
 const admin=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)return res.status(401).json({error:"Session is invalid or expired."});
 let body={};try{const chunks=[];for await(const chunk of req)chunks.push(chunk);body=JSON.parse(Buffer.concat(chunks).toString());}catch{return res.status(400).json({error:"Invalid JSON."});}
 const pageUrl=String(body.url||"").trim();if(!pageUrl)return res.status(400).json({error:"A public source URL is required."});
 let parsed;try{parsed=new URL(pageUrl);}catch{return res.status(400).json({error:"That URL is not valid."});}if(!/^https?:$/.test(parsed.protocol))return res.status(400).json({error:"Only HTTP(S) URLs are supported."});
 const source=sourceFor(pageUrl);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const upstream=await fetch(pageUrl,{redirect:"follow",headers:{"User-Agent":"CornerstoneAI/1.0 reference-board metadata fetch",Accept:"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"},signal:controller.signal});
  if(!upstream.ok)return res.status(502).json({error:"Source page returned "+upstream.status+".",source});
  const type=upstream.headers.get("content-type")||"";if(!type.includes("text/html"))return res.status(415).json({error:"The source is not an HTML page.",source});
  const html=(await upstream.text()).slice(0,1500000);const ld=jsonLd(html);const product=ld.find(x=>String(x&&x["@type"]||"").toLowerCase().includes("product"))||{};
  const imageUrl=clean(body.image_url||meta(html,"og:image")||meta(html,"twitter:image")||firstImage(product.image));
  const canonicalUrl=clean(meta(html,"og:url")||meta(html,"canonical","name")||upstream.url||pageUrl);
  const title=clean(body.title||meta(html,"og:title")||meta(html,"twitter:title")||product.name);
  const description=clean(body.description||meta(html,"og:description")||meta(html,"description","name")||product.description);
  const brand=clean(typeof product.brand==="string"?product.brand:product.brand&&product.brand.name);
  const structured={source,requested_url:pageUrl,resolved_url:upstream.url||pageUrl,title:title||null,description:description||null,brand:brand||null,image_url:imageUrl||null,product_type:product["@type"]||null,publisher:meta(html,"og:site_name")||null,retrieved_at:new Date().toISOString()};
  return res.status(200).json({ok:true,owner_id:auth.data.user.id,source_platform:source,source_url:pageUrl,canonical_url:canonicalUrl,image_url:imageUrl||null,title:title||null,description:description||null,structured_data:structured,recipe:recipe(source,title,description),can_analyse_image:Boolean(imageUrl),note:source==="pinterest"?"Public Pin metadata captured. Pinterest API access is optional and requires an approved Pinterest app.":(source==="vinted"||source==="depop")?"Public listing metadata captured using standard page metadata; no private marketplace API is required.":"Public page metadata captured."});
 }catch(error){return res.status(502).json({error:error&&error.name==="AbortError"?"Source page timed out.":(error&&error.message||"Could not read that public page."),source});}finally{clearTimeout(timer);}
}
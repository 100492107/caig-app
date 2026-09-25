import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { creatorDnaFor, creatorDnaText } from '../shared/creator-dna.js'
import { aspectFromVision, generateCreatorImage } from './imageGeneration/qwenImageClient.js'
import { sceneDirectionSystemBlock, VISION_JSON_COMPLETION_CHECK } from '../shared/scene-direction-knowledge.js'

const PEOPLE = [
  ['cara', 'Cara', 'Build · agency · earned progress'],
  ['lila', 'Lila', 'Notice · presence · quiet discernment'],
  ['cara_lila', 'Cara + Lila', 'Build + notice · contrast · chemistry'],
]
const JOBS = [
  ['content', 'Content creation', 'Repeatable ideas, scripts, shots and series.'],
  ['tiktok_shop', 'TikTok Shop', 'Product-led creative, demos and conversion tests.'],
  ['affiliate', 'Affiliate', 'Offer-led content, trust and click-through tests.'],
  ['fanvue', 'Fanvue', 'Owned-creator positioning, cadence and conversion.'],
  ['growth', 'Audience growth', 'Hooks, formats and recurring series.'],
]
const CREATOR_IMAGES = { cara: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg', lila: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_12.jpeg' }
const PLATFORMS = ['TikTok', 'Instagram', 'YouTube Shorts', 'TikTok + Instagram', 'Multi-platform']
const FORMATS = ['Personal moment', 'POV / relatable', 'Quick take', 'Micro-story', 'GRWM', 'Day in the life', 'Photo slideshow', 'Reaction', 'Product-led demo', 'Story + recommendation']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitJob(id, setMessage) {
  const until = Date.now() + 45 * 60 * 1000
  while (Date.now() < until) {
    const { data, error } = await supabase.from('local_ai_jobs').select('status,result,error_message').eq('id', id).maybeSingle()
    if (error) throw error
    if (data?.status === 'completed') return data.result || '{}'
    if (data?.status === 'error') throw new Error(data.error_message || 'Creator job failed.')
    setMessage(data?.status === 'processing' ? 'Cornerstone is thinking…' : 'Creator strategy is queued…')
    await sleep(2500)
  }
  throw new Error('Creator strategy took too long. Check System.')
}

function json(raw) {
  const text = String(raw || '').replace(/```json|```/gi, '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim()
  try { return JSON.parse(text) } catch {}
  const start = text.search(/[\[{]/)
  if (start < 0) throw new Error('Cornerstone returned unreadable creator output.')
  const open = text[start], close = open === '{' ? '}' : ']'
  let depth = 0, quoted = false, escaped = false
  for (let i = start; i < text.length; i += 1) {
    const c = text[i]
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue }
    if (c === '"') quoted = true
    else if (c === open) depth += 1
    else if (c === close && --depth === 0) return JSON.parse(text.slice(start, i + 1))
  }
  throw new Error('Cornerstone returned incomplete creator output.')
}

export default function CreatorEngineWorkspaceFixed() {
  const [persona, setPersona] = useState('cara')
  const [jobType, setJobType] = useState('content')
  const [platform, setPlatform] = useState('TikTok')
  const [format, setFormat] = useState('Personal moment')
  const [reference, setReference] = useState('')
  const [offer, setOffer] = useState('')
  const [direction, setDirection] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [copiedPrompt, setCopiedPrompt] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [recent, setRecent] = useState([])
  const [generatedImages, setGeneratedImages] = useState({})
  const [imageBusy, setImageBusy] = useState(null)
  const [visualReferencePack, setVisualReferencePack] = useState(null)
  const [visualReferenceRecipe, setVisualReferenceRecipe] = useState(null)
  const [commerceContext, setCommerceContext] = useState(null)
  const [savedProjectId, setSavedProjectId] = useState('')
  const [savingPackage, setSavingPackage] = useState(false)

  const person = PEOPLE.find((p) => p[0] === persona) || PEOPLE[0]
  const job = JOBS.find((j) => j[0] === jobType) || JOBS[0]
  const dna = creatorDnaFor(persona)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cornerstone_visual_reference_pack')
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed && Array.isArray(parsed.images) && parsed.images.length) setVisualReferencePack(parsed)
      const recipeRaw = sessionStorage.getItem('cornerstone_visual_reference_recipe')
      const recipe = recipeRaw ? JSON.parse(recipeRaw) : null
      if (recipe?.recipe?.looks?.length) setVisualReferenceRecipe(recipe)
      const commerceRaw = sessionStorage.getItem('cornerstone_commerce_context')
      const commerce = commerceRaw ? JSON.parse(commerceRaw) : null
      if (commerce?.title) {
        setCommerceContext(commerce)
        if (['cara', 'lila', 'cara_lila'].includes(commerce.creator)) setPersona(commerce.creator)
      }
    } catch {}
  }, [])

  async function loadRecent() {
    const { data } = await supabase.from('local_ai_jobs').select('id,title,status,created_at,persona_id,options').eq('owner_id', (await supabase.auth.getUser()).data.user?.id || '').eq('job_type', 'growth_mode').order('created_at', { ascending: false }).limit(30)
    setRecent(data || [])
  }
  useEffect(() => { loadRecent().catch((e) => setError(e?.message || String(e))) }, [])

  async function copyPrompt(text, key) {
    try {
      await navigator.clipboard.writeText(String(text || ''))
      setCopiedPrompt(key)
      window.setTimeout(() => setCopiedPrompt(''), 1400)
    } catch {
      setError('Copy failed. Select the prompt and copy it manually.')
    }
  }

  function asObject(value) {
    if (value && typeof value === 'object') return value
    if (typeof value !== 'string') return null
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : null } catch {}
    return null
  }

  function flowPromptFor(item) {
    if (!item) return ''
    const value = item.flow_prompt || item.image_generation_prompt || item.prompt || ''
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }
  async function generateQwenImage(item, index) {
    const vision = asObject(item?.vision_json || item?.vision || item?.json_prompt) || null
    const flow = flowPromptFor(item)
    setImageBusy(index)
    setError('')
    setMessage('Qwen Image 2.1 · generating shot ' + (item?.shot || index + 1) + '…')
    try {
      const data = await generateCreatorImage({
        creator: persona,
        visionJson: vision,
        flowPrompt: flow,
        aspectRatio: aspectFromVision(vision),
        references: (visualReferencePack?.images || []).slice(0, 8),
        postId: 'voices-' + persona + '-shot-' + (item?.shot || index + 1),
      })
      setGeneratedImages((current) => ({ ...current, [index]: data }))
      setMessage('Qwen Image 2.1 · shot ' + (item?.shot || index + 1) + ' ready.')
    } catch (e) {
      setError(e?.message || String(e))
      setMessage('')
    } finally {
      setImageBusy(null)
    }
  }


  const visualBoardContext = visualReferencePack ? [
    'ACTIVE VISUAL REFERENCE BOARD: ' + (visualReferencePack.name || 'Visual Reference Board'),
    'Board purpose: ' + (visualReferencePack.purpose || 'mixed'),
    'Use the supplied reference images as wardrobe, pose, environment and composition structure only.',
    'Never copy identity, face, branding or distinctive execution.',
    'Reference count: ' + ((visualReferencePack.images || []).length)
  ].join('\\n') : 'NO ACTIVE VISUAL REFERENCE BOARD';

  const commerceContextText = commerceContext ? [
    'ACTIVE COMMERCE OPPORTUNITY: ' + (commerceContext.title || 'Untitled opportunity'),
    'Trend signal: ' + (commerceContext.trend || 'Not supplied'),
    'Product angle: ' + (commerceContext.product_angle || 'Not supplied'),
    'Aesthetic angle: ' + (commerceContext.aesthetic_angle || 'Not supplied'),
    'Content concept: ' + (commerceContext.content_concept || 'Not supplied'),
    'Monetisation route: ' + (commerceContext.monetisation_route || 'Not supplied'),
    'Monetisation test: ' + (commerceContext.monetisation_test || 'Not supplied'),
    'KPI: ' + (commerceContext.kpi || 'Not supplied'),
    'Winner rule: ' + (commerceContext.winner_rule || 'Not supplied'),
    'CTA: ' + (commerceContext.cta || 'Not supplied'),
    'Evidence context: ' + JSON.stringify((commerceContext.signals || []).slice(0, 8)).slice(0, 14000),
    'Treat imported commerce data as evidence, not as guaranteed claims. Do not invent prices, commissions, availability, reviews, sales or platform eligibility.'
  ].join('\n') : 'NO ACTIVE COMMERCE OPPORTUNITY';

  async function saveToMake() {
    if (!result || savingPackage || savedProjectId) return
    setSavingPackage(true)
    setError('')
    setMessage('Saving this creator test into the canonical Make queue…')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth?.user) throw new Error('Please sign in again.')
      const title = String(pack.series || brief.recommended_subject || pack.concept || job[1] || 'Creator commerce test').trim()
      const hooks = Array.isArray(pack.hooks) ? pack.hooks : []
      const hashtags = Array.isArray(pack.hashtags) ? pack.hashtags.join(' ') : String(pack.hashtags || '')
      const sourceUrl = commerceContext?.signals?.find((signal) => signal?.source_url)?.source_url || reference.trim() || null
      let commerceTestId = null
      if (commerceContext?.opportunity_id) {
        const { data: existingTest, error: testLookupError } = await supabase
          .from('cornerstone_commerce_tests')
          .select('id')
          .eq('owner_id', auth.user.id)
          .eq('opportunity_id', commerceContext.opportunity_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (testLookupError) throw testLookupError
        commerceTestId = existingTest?.id || null
        if (!commerceTestId) {
          const { data: createdTest, error: testInsertError } = await supabase.from('cornerstone_commerce_tests').insert({
            owner_id: auth.user.id,
            opportunity_id: commerceContext.opportunity_id,
            creator_id: commerceContext.creator || persona,
            platform,
            monetisation_route: commerceContext.monetisation_route || job[1],
            source_signal_ids: commerceContext.signal_ids || [],
            tracking_url: commerceContext.tracking_destination || commerceContext.tracking_url || null,
            cta: commerceContext.cta || pack.cta || 'Use the tracked product destination.',
            kpi: commerceContext.kpi || result?.monetisation?.success_metric || 'Views → clicks → conversions → commission',
            winner_rule: commerceContext.winner_rule || result?.monetisation?.winner_rule || 'Repeat only after observed evidence.',
            status: 'planned',
            metadata: { opportunity_title: commerceContext.title || null },
          }).select('id').single()
          if (testInsertError) throw testInsertError
          commerceTestId = createdTest?.id || null
        }
      }

      const briefPayload = {
        creator_id: persona,
        creator_name: person[1],
        objective: jobType,
        platform,
        format,
        operator_brief: brief,
        creator_package: pack,
        monetisation: result?.monetisation || {},
        commerce_context: commerceContext || null,
        commerce_test_id: commerceTestId,
        saved_from: 'Creator Engine / Voices',
      }
      const sourceEvidence = {
        commerce_context: commerceContext || null,
        source_url: sourceUrl,
        captured_at: new Date().toISOString(),
        evidence_status: brief.evidence_status || 'insufficient',
      }
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_track_b_content_package', {
        p_title: title,
        p_source_url: sourceUrl,
        p_source_type: 'creative_brief',
        p_brief: briefPayload,
        p_source_evidence: sourceEvidence,
        p_platform: platform,
        p_hook: hooks[0] || pack.opening_beat || brief.recommended_angle || '',
        p_caption: pack.caption || pack.script || '',
        p_hashtags: hashtags,
        p_cta: pack.cta || result?.monetisation?.test || commerceContext?.cta || '',
        p_photo_idea: typeof pack.visual_direction === 'string' ? pack.visual_direction : JSON.stringify(pack.visual_direction || {}),
        p_photo_direction: JSON.stringify({ scene_directions: pack.scene_directions || [], visual_direction: pack.visual_direction || [], image_prompts: pack.image_prompts || [] }),
        p_post_type: pack.format || format,
        p_content_queue_id: 'ce-' + crypto.randomUUID(),
      })
      if (rpcError) throw rpcError
      const projectId = rpcData?.[0]?.project_id || rpcData?.project_id || null
      if (!projectId) throw new Error('Cornerstone saved the package but returned no project id.')

      if (commerceTestId) {
        await supabase.from('cornerstone_commerce_tests').update({
          metadata: { ...(commerceContext || {}), project_id: projectId, creator_package_saved_at: new Date().toISOString() },
        }).eq('id', commerceTestId).eq('owner_id', auth.user.id)
      }
      setSavedProjectId(projectId)
      setMessage('Saved to the canonical content project. The next step is Make.')
    } catch (e) {
      setError(e?.message || String(e))
      setMessage('')
    } finally {
      setSavingPackage(false)
    }
  }

  async function build() {
    setBusy(true); setError(''); setResult(null); setMessage('Building creator strategy…')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth?.user) throw new Error('Please sign in again.')
      const source = reference.trim() ? `REFERENCE / SIGNAL URL: ${reference.trim()}` : 'REFERENCE / SIGNAL URL: None'
      const prompt = `CREATOR: ${person[1]}\nPERSONA_ID: ${persona}\nPLATFORM: ${platform}\nOBJECTIVE: ${job[1]}\nOBJECTIVE_DETAIL: ${job[2]}\nFORMAT: ${format}\nOFFER / PRODUCT: ${offer.trim() || 'None'}\n${source}\nOPERATOR_DIRECTION: ${direction.trim() || 'Choose the strongest current opportunity.'}\n\nYou are Cornerstone Track B Creator Growth. Protect the selected creator identity and use existing character source-of-truth context. Build useful, platform-native work rather than generic ideas.\n\nFROZEN CREATOR DNA:\n${creatorDnaText(persona)}\n\n${sceneDirectionSystemBlock(persona)}\n\n${VISION_JSON_COMPLETION_CHECK}\n\n${visualBoardContext}\n\nMASTER IMAGE REFERENCE AVAILABLE: ${persona === 'cara' ? 'Cara master/reference image is already stored in Cornerstone and must be used as the visual identity anchor in Flow Labs.' : persona === 'lila' ? 'Lila master/reference image is already stored in Cornerstone and must be used as the visual identity anchor in Flow Labs.' : 'Both Cara and Lila master/reference images are already stored in Cornerstone and must be used as distinct visual identity anchors in Flow Labs.'}\n\nCHARACTER REASONING RULE:\nDo not reduce the selected creator to surface adjectives. Before proposing content, determine what this character would notice, want, refuse, choose, find ridiculous, or remember in the situation. Let worldview, contradictions, social role and narrative arc determine the recommendation. For duo mode, preserve both minds and use their contrast rather than blending them.\n\nContent creation: create a repeatable series, specific concept, hook set, spoken script, shot list, scene directions, caption and derivatives.\nTikTok Shop: develop product-led content tests, demonstration structure, trust/proof moments, natural purchase timing and CTA tests. Never invent product claims, discounts, commissions, reviews or results.\nAffiliate: develop trust-first recommendation content, problem-solution fit, disclosure, click path, CTA and offer tests. Never invent commissions, prices, product facts, reviews or results.\nFanvue: develop appropriate owned-creator positioning, public-to-paid content ladder, cadence, conversion and retention ideas. Do not invent audience behaviour, subscribers or revenue.\nGrowth: develop recurring series, hook systems, audience recognition and retention loops.\n\nNever invent follower counts, views, sales, earnings, testimonials, audience reactions, private analytics or commercial facts. Separate observed evidence, public signals, inference and creative recommendation.

ALL HUMAN-FACING COPY RULE:
- Write every non-JSON human-facing field in clear British English.
- All JSON keys must be in English.
- The Flow Labs prompt must be plain English, ready to copy and paste.
- Do not include another language unless the operator explicitly requests it.

MASTER REFERENCE HANDOFF:
- The user already has canonical master/reference images for Cara and Lila in Cornerstone.
- Never invent a replacement identity.
- For Cara, instruct Flow Labs to use the supplied Cara master/reference image as the canonical identity anchor.
- For Lila, instruct Flow Labs to use the supplied Lila master/reference image as the canonical identity anchor.
- For Cara + Lila, instruct Flow Labs to use both supplied master/reference images and preserve the two identities as distinct people.
- Do not put Supabase URLs or internal asset URLs into the Flow Labs prompt. The user will attach the supplied reference image(s) in Flow Labs.
- Preserve identity continuity across every shot in a batch.

IMAGE PROMPT REQUIREMENT:
For every image needed to execute the concept, return an image_prompts item with:
1. "shot" — integer shot number.
2. "purpose" — what the image is doing in the content.
3. "vision_json" — a fully populated structured JSON object describing the intended image at production level.
4. "flow_prompt" — a separate, polished English prompt the operator can copy directly into Google Flow Labs after attaching the relevant master/reference image(s).
5. "continuity_notes" — what must remain consistent with the creator and previous images.

The vision_json must follow this structure and must be populated with scene-specific values rather than placeholders:
{
  "prompt_type": "photorealistic_creator_scene",
  "objective": "",
  "master_reference": {
    "creator": "",
    "usage": "Use the supplied master/reference image as the canonical identity anchor. Preserve the creator's face, proportions, hair identity and overall visual identity."
  },
  "reference_fidelity": {
    "target": "extremely high identity and scene fidelity",
    "priority_order": [
      "creator identity",
      "composition and crop",
      "expression and pose",
      "hair and makeup",
      "wardrobe",
      "environment",
      "lighting",
      "camera rendering"
    ]
  },
  "canvas": {
    "orientation": "portrait",
    "aspect_ratio": "",
    "framing": "",
    "crop": "",
    "subject_scale": "",
    "subject_alignment": "",
    "camera_distance": "",
    "headroom": "",
    "bottom_crop": ""
  },
  "scene": {
    "location": "",
    "time_of_day": "",
    "mood": "",
    "visual_style": "authentic high-resolution smartphone photography",
    "background_complexity": "",
    "environment": {
      "architecture": "",
      "furniture": "",
      "props": "",
      "background_details": "",
      "lighting_context": ""
    }
  },
  "subject": {
    "description": "",
    "position": "",
    "body_visibility": "",
    "pose": {
      "head": "",
      "torso": "",
      "shoulders": "",
      "arms": "",
      "hands": "",
      "posture": ""
    },
    "expression": {
      "overall": "",
      "mouth": "",
      "gaze": "",
      "brows": ""
    }
  },
  "face": {
    "identity_instruction": "Preserve the supplied master/reference identity exactly.",
    "face_shape": "",
    "eyes": {
      "shape": "",
      "colour": "",
      "expression": "",
      "lashes": "",
      "catchlights": ""
    },
    "eyebrows": {
      "shape": "",
      "colour": "",
      "density": "",
      "finish": ""
    },
    "nose": {
      "shape": "",
      "bridge": "",
      "tip": ""
    },
    "lips": {
      "shape": "",
      "colour": "",
      "finish": ""
    },
    "makeup": {
      "style": "",
      "base": "",
      "bronzer": "",
      "blush": "",
      "eyes": "",
      "lips": ""
    }
  },
  "skin": {
    "tone": "",
    "undertone": "",
    "finish": "realistic skin with natural fine texture",
    "texture": "subtle pores, believable tonal variation and natural imperfections",
    "retouching": "light and believable, never plastic"
  },
  "hair": {
    "colour": "",
    "style": "",
    "part": "",
    "texture": "",
    "front_sections": "",
    "back": "",
    "flyaways": "",
    "shine": ""
  },
  "jewelry": {
    "earrings": "",
    "necklace": "",
    "other": ""
  },
  "wardrobe": {
    "outfit": "",
    "materials": "",
    "colours": "",
    "fit": "",
    "details": ""
  },
  "body_and_pose": {
    "shoulders": "",
    "collarbones": "",
    "torso": "",
    "arms": "",
    "hands": "",
    "continuity": "Maintain the creator's real proportions and anatomy from the supplied reference."
  },
  "background": {
    "left": "",
    "centre": "",
    "right": "",
    "depth": "",
    "blur": ""
  },
  "lighting": {
    "type": "",
    "primary_source": "",
    "direction": "",
    "quality": "",
    "contrast": "",
    "subject_effect": "",
    "background_effect": "",
    "colour_temperature": "",
    "shadow_style": ""
  },
  "camera": {
    "device": "modern smartphone",
    "orientation": "vertical portrait",
    "lens": "",
    "focal_length_equivalent": "",
    "camera_height": "",
    "camera_distance": "",
    "perspective": "",
    "focus": "",
    "depth_of_field": "",
    "image_quality": "high-resolution natural smartphone rendering",
    "dynamic_range": "",
    "processing": "",
    "grain": "",
    "motion_blur": ""
  },
  "composition_geometry": {
    "face_position": "",
    "eye_line": "",
    "subject_axis": "",
    "key_prop_position": "",
    "visual_balance": ""
  },
  "colour_palette": {
    "dominant_colours": [],
    "skin": "",
    "hair": "",
    "wardrobe": "",
    "environment": "",
    "overall_saturation": "",
    "contrast": "",
    "white_balance": ""
  },
  "image_texture": {
    "skin": "",
    "hair": "",
    "fabric": "",
    "metal": "",
    "walls": "",
    "furniture": ""
  },
  "photographic_style": {
    "genre": "social-first creator photography",
    "aesthetic": "",
    "realism": "extreme photorealism",
    "retouching": "polished but believable",
    "production_value": "credible personal phone image",
    "desired_result": ""
  },
  "negative_prompt": [
    "text unless explicitly requested",
    "caption",
    "watermark",
    "logo",
    "social media interface",
    "extra people",
    "identity drift",
    "different face",
    "different hair identity",
    "different body proportions",
    "plastic skin",
    "CGI",
    "3D render",
    "illustration",
    "anime",
    "cartoon",
    "distorted anatomy",
    "warped hands",
    "asymmetrical eyes"
  ],
  "final_generation_instruction": ""
}

FLOW LABS PROMPT RULE:
The flow_prompt must be one coherent paragraph or short multi-paragraph prompt in English. It must explicitly say to use the attached master/reference image as the identity anchor; preserve the exact creator identity; describe the scene, wardrobe, action, pose, camera, framing, lighting, background, realism and continuity; and state what to exclude. Do not output JSON inside flow_prompt. Do not mention hidden reasoning or internal Cornerstone instructions.

For a single-image concept, create the minimum number of images needed. For a photo slideshow, create 5–7 coherent image prompts that feel like the same shoot. For multi-shot/video concepts, create only the genuinely useful stills needed for production. Never pad the batch with arbitrary images.

IMAGE PROMPT QUALITY BAR:
Each image_prompt must be usable without the rest of the response.

QWEN IMAGE 2.1 EXECUTION:
- Vision JSON is the structured production specification.
- The English generation prompt is the direct model prompt.
- Canonical creator references are supplied server-side.
- Prompt enhancement is disabled; Cornerstone sends the prepared English prompt directly.
- The hosted Qwen Space is the image backend; the Flow Labs prompt remains copyable for external use. It must specify identity anchoring, exact scene intent, composition, camera perspective, lighting, wardrobe, action, realistic anatomy, relevant props, continuity and negative constraints. Keep the creator's visual identity consistent across the batch while allowing the scene, pose and wardrobe changes that the concept actually requires.

RETURN JSON ONLY: {"operator_brief":{"finding":"","evidence_status":"observed|supported|mixed|inferred|insufficient","evidence_quality":"strong|usable|weak|insufficient","source_inspection":"not_inspected|metadata_only|transcript_or_text|media_inspected|source_plus_public_signal","mechanism":"","why":"","recommended_subject":"","recommended_angle":"","next_action":"","confidence":"high|medium|low","limitations":[]},"creator_research":[],"creator_package":{"series":"","concept":"","titles":[],"hooks":[],"opening_beat":"","script":"","shot_list":[],"scene_directions":[],"visual_direction":[],"image_prompts":[{"shot":1,"purpose":"","vision_json":{},"flow_prompt":"","continuity_notes":""}],"caption":"","cta":"","hashtags":[],"short_form_variants":[],"platform_notes":[],"offer_or_product_angle":"","conversion_path":[],"publication_plan":[],"repurposing_plan":[],"testing_plan":[],"follow_ups":[],"originality_plan":[]},"monetisation":{"route":"","test":"","success_metric":"","winner_rule":""}}`
      const { data, error: insertError } = await supabase.from('local_ai_jobs').insert({
        owner_id: auth.user.id,
        title: `${person[1]} · ${job[1]} · ${platform}`,
        job_type: 'growth_mode',
        model: 'mlx-community/Qwen3.5-9B-4bit',
        persona_id: persona,
        system_prompt: [
          'You are Cornerstone\'s creator growth director. Research domain: TRACK_B_CREATOR_GROWTH. Persona is ' + persona + '. Objective is ' + job[1] + '. Platform is ' + platform + '. Protect creator identity and use the relevant character bible.',
          'FROZEN CREATOR DNA:\n' + creatorDnaText(persona),
          'CHARACTER REASONING RULE: Do not reduce the creator to surface adjectives. Let the worldview, contradictions, social role and narrative arc drive the strategy.',
          sceneDirectionSystemBlock(persona),
          VISION_JSON_COMPLETION_CHECK,
          commerceContext ? commerceContextText : '',
          visualReferenceRecipe ? [
            'ACTIVE VISUAL RECIPE: ' + (visualReferenceRecipe.name || 'Generated look system'),
            'Use this recipe as structured wardrobe / pose / environment inspiration. Preserve canonical creator identity and original execution.',
            JSON.stringify(visualReferenceRecipe.recipe || {}).slice(0, 18000),
          ].join('\n') : '',
          visualReferencePack ? [
            'ACTIVE VISUAL REFERENCE BOARD: ' + (visualReferencePack.name || 'Visual reference board'),
            'Use the supplied board images as structure references only. Preserve the selected creator identity.',
            'Board purpose: ' + (visualReferencePack.purpose || 'mixed'),
            'REFERENCE RECIPES: ' + JSON.stringify((visualReferencePack.references || []).map((x) => ({ source: x.source, category: x.category, title: x.title, recipe: x.recipe, analysis: x.analysis })).slice(0, 8)).slice(0, 18000)
          ].join('\n') : ''
        ].filter(Boolean).join('\n\n'),
        user_prompt: prompt,
        options: { research: true, max_tokens: 6000, temperature: 0.45, research_domain: 'TRACK_B_CREATOR_GROWTH', workspace_id: 'track_b', creator_objective: jobType, platform, format, reference_url: reference.trim() || null, offer: offer.trim() || null },
        status: 'queued',
        production_status: 'creator_strategy_queued',
      }).select('id').single()
      if (insertError || !data?.id) throw insertError || new Error('Could not queue creator strategy.')
      setResult(json(await waitJob(data.id, setMessage)))
      setMessage('Creator strategy ready.')
      await loadRecent()
    } catch (e) { setError(e?.message || String(e)); setMessage('') }
    finally { setBusy(false) }
  }

  const pack = result?.creator_package || result?.production_package || {}
  const brief = result?.operator_brief || {}
  const list = (value, limit = 10) => Array.isArray(value) ? value.slice(0, limit) : []
  const renderItem = (value) => typeof value === 'string' ? value : value?.hook || value?.title || value?.direction || value?.scene || value?.concept || JSON.stringify(value)

  return <main className="creator-engine">
    <style>{STYLE}</style>
    {!result ? <>
      <header>
        <div className="ce-kicker">VOICES / CREATOR LAB</div>
        <h1>Build a creator people can recognise.</h1>
        <p className="ce-lead">Cara and Lila are not prompts. They are owned characters with different instincts, voices and story engines. This is where you decide what a creator business is testing next.</p>
      </header>

{commerceContext ? <div className="ce-dna" style={{ marginTop: 16 }}><article className="ce-dna-card"><small>ACTIVE COMMERCE OPPORTUNITY</small><strong>{commerceContext.title}</strong><p>{commerceContext.trend || 'Trend evidence'} → {commerceContext.product_angle || 'product angle'} → {commerceContext.monetisation_route || 'monetisation test'}</p><button onClick={() => { sessionStorage.removeItem('cornerstone_commerce_context'); sessionStorage.removeItem('cornerstone_creator_opportunity'); setCommerceContext(null) }}>Clear commerce brief</button></article></div> : null}

{visualReferencePack ? <div className="ce-dna" style={{ marginTop: 16 }}><article className="ce-dna-card"><small>ACTIVE VISUAL BOARD</small><strong>{visualReferencePack.name}</strong><p>Applying {visualReferencePack.images.length} public reference image{visualReferencePack.images.length === 1 ? '' : 's'} as wardrobe / pose / scene structure only. Identity remains canonical.</p>{visualReferenceRecipe ? <small style={{display:'block',marginTop:8}}>Recipe: {visualReferenceRecipe.name}</small> : null}<button onClick={() => { sessionStorage.removeItem('cornerstone_visual_reference_pack'); sessionStorage.removeItem('cornerstone_visual_reference_recipe'); setVisualReferencePack(null); setVisualReferenceRecipe(null) }}>Clear board</button></article></div> : null}

      <section className="ce-roster" aria-label="Owned creators">
        {PEOPLE.map((p) => <button key={p[0]} className={persona === p[0] ? 'active' : ''} onClick={() => setPersona(p[0])}>
          {p[0] === 'cara_lila' ? <div className="ce-roster-pair"><img src={CREATOR_IMAGES.cara} alt="" /><img src={CREATOR_IMAGES.lila} alt="" /></div> : <img className="ce-roster-image" src={CREATOR_IMAGES[p[0]]} alt={p[1]+' reference'} />}
          <b>{p[1]}</b><span>{p[2]}</span>
        </button>)}
      </section>

      <section className="ce-dna" aria-label="Creator identity">
        <article className="ce-dna-card">
          <small>{dna.coreVerb || 'Creator identity'} · core need</small>
          <strong>{dna.coreNeed || dna.coreDynamic || 'Distinct creator identity'}</strong>
          <p className="ce-dna-quote">“{dna.soul || dna.sharedSoul || dna.signatureQuestion || ''}”</p>
          <div className="ce-dna-list">
            <div><b>Audience fantasy</b><span>{dna.audienceFantasy || dna.signatureQuestion}</span></div>
            <div><b>Story engine</b><span>{dna.storyEngine || dna.contentEngine || dna.relationshipRules?.[0] || ''}</span></div>
          </div>
        </article>
        <article className="ce-dna-card">
          <small>{persona === 'cara_lila' ? 'Relationship DNA' : 'Behavioural source of truth'}</small>
          <strong>{dna.socialRole || dna.coreDynamic || dna.signatureQuestion}</strong>
          <p>{dna.narrativeArc || dna.contentEngine || 'The character should make decisions from her own worldview, not from a generic influencer template.'}</p>
          <div className="ce-dna-list">
            <div><b>{persona === 'cara_lila' ? 'Contrast' : 'Signature question'}</b><span>{persona === 'cara_lila' ? (dna.contrast || []).slice(0,2).join(' · ') : dna.signatureQuestion}</span></div>
            <div><b>Audience feeling</b><span>{dna.audienceFantasy || 'A creator people recognise without being told who she is.'}</span></div>
          </div>
        </article>
      </section>

      <div className="ce-kicker">01 / MISSION</div>
      <section className="ce-objectives">{JOBS.map((j) => <button key={j[0]} className={jobType === j[0] ? 'active' : ''} onClick={() => setJobType(j[0])}><b>{j[1]}</b><span>{j[2]}</span></button>)}</section>

      <section className="ce-form">
        <div className="ce-row">
          <label>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
        <label>Signal / reference<input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Winning post, trend, product, offer, story or content reference" /></label>
        {(jobType === 'tiktok_shop' || jobType === 'affiliate') ? <label>Offer / product<input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="What commercial test are you considering?" /></label> : null}
        <label>Operator direction<textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="What are you trying to learn, test or make happen?" /></label>
        {error ? <div className="ce-error">{error}</div> : null}
        <div className="ce-actions">
          <span>{message || (person[1]+' · '+job[1]+' · '+platform)}</span>
          <button onClick={build} disabled={busy} className="ce-primary">{busy ? 'Building…' : 'Run the mission →'}</button>
        </div>
      </section>

      <section className="ce-recent"><b>Recent work · {person[1]}</b>{recent.filter((x) => x.persona_id === persona).slice(0, 8).map((x) => <div key={x.id}><strong>{x.title}</strong><span>{x.status} · {new Date(x.created_at).toLocaleDateString('en-GB')}</span></div>)}</section>
    </> : <>
      <div className="ce-kicker">{person[1].toUpperCase()} · {job[1].toUpperCase()} · RESULT</div>
      <h1>{pack.series || brief.recommended_subject || job[1]}</h1>
      <p className="ce-lead">{brief.recommended_angle || brief.finding || pack.concept || 'Creator experiment ready.'}</p>
      <section className="ce-dna">
        <article className="ce-dna-card"><small>Character choice</small><strong>{dna.coreVerb || 'Creator identity'}</strong><p>{dna.signatureQuestion || dna.coreDynamic || ''}</p></article>
        <article className="ce-dna-card"><small>Next handoff</small><strong>{savedProjectId ? 'Saved → Make → Publish → Learn' : 'Save → Make → Publish → Learn'}</strong><p>{savedProjectId ? 'This package is now a canonical project. Open Make to turn it into finished media.' : 'Save this approved creator test into the canonical project layer before producing anything. Nothing is considered shipped until it exists in the loop.'}</p><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>{savedProjectId ? <a href="/content/production" className="ce-primary" style={{display:'inline-flex',alignItems:'center',textDecoration:'none'}}>Open Make →</a> : <button type="button" className="ce-primary" onClick={saveToMake} disabled={savingPackage}>{savingPackage ? 'Saving…' : 'Save to Make →'}</button>}</div></article>
      </section>
      <div className="ce-grid"><article><span>What Cornerstone found</span><b>{brief.finding || 'Opportunity identified.'}</b></article><article><span>Mechanism</span><b>{brief.mechanism || 'Creator-native mechanism.'}</b></article><article><span>Next action</span><b>{brief.next_action || 'Run the first test.'}</b></article><article><span>Money route</span><b>{result?.monetisation?.route || job[1]}</b></article></div>
      {list(result?.creator_research).length ? <section className="ce-section"><span>Evidence & comparable patterns</span>{list(result.creator_research).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.titles).length ? <section className="ce-section"><span>Titles / headlines</span>{list(pack.titles, 8).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.hooks).length ? <section className="ce-section"><span>Hooks</span>{list(pack.hooks, 8).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      <section className="ce-two"><section className="ce-section"><span>Concept & spoken execution</span><div>{pack.concept || ''}</div><div>{pack.script || ''}</div></section><section className="ce-section"><span>Offer & conversion</span><div>{pack.offer_or_product_angle || 'No specific product/offer selected.'}</div>{list(pack.conversion_path, 6).map((x, i) => <div key={i}>{renderItem(x)}</div>)}<div>{result?.monetisation?.test || pack.testing_plan?.[0] || 'Run one measurable test.'}</div></section></section>
      {list(pack.scene_directions).length ? <section className="ce-section"><span>Scenes & visual direction</span>{list(pack.scene_directions, 10).map((x, i) => <div key={i}>{renderItem(x)}</div>)}{list(pack.visual_direction, 6).map((x, i) => <div key={`v${i}`}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.image_prompts, 12).length ? <section className="ce-section ce-image-section"><span>Image direction · Vision JSON + Flow Labs prompts</span><div className="ce-image-list">{list(pack.image_prompts, 12).map((item, i) => { const vision = asObject(item?.vision_json || item?.vision || item?.json_prompt) || {}; const flow = flowPromptFor(item); const vKey = `vision-${i}`; const fKey = `flow-${i}`; return <article className="ce-image-card" key={i}>
  <div className="ce-image-head"><b>Shot {item?.shot || i + 1}</b><span>{item?.purpose || 'Production image'}</span></div>
  <div className="ce-image-meta">{item?.continuity_notes || 'Use the supplied master/reference image as the identity anchor.'}</div>
  <div className="ce-prompt-panel">
    <div className="ce-prompt-head"><span>Vision JSON</span><button type="button" onClick={() => copyPrompt(JSON.stringify(vision, null, 2), vKey)}>{copiedPrompt === vKey ? 'Copied' : 'Copy JSON'}</button></div>
    <pre>{JSON.stringify(vision, null, 2)}</pre>
  </div>
  <div className="ce-prompt-panel ce-flow-panel">
    <div className="ce-prompt-head"><span>Generation prompt · English · Qwen Image 2.1</span><button type="button" onClick={() => copyPrompt(flow, fKey)}>{copiedPrompt === fKey ? 'Copied' : 'Copy prompt'}</button></div>
    <textarea readOnly value={flow} aria-label={'Generation prompt for shot ' + (item?.shot || i + 1)} />
    <div className="ce-image-actions">
      <button type="button" className="ce-qwen-button" onClick={() => generateQwenImage(item, i)} disabled={imageBusy !== null}>{imageBusy === i ? 'Generating…' : 'Generate with Qwen Image 2.1 →'}</button>
      <span>Qwen Image 2.1 · canonical references supplied server-side</span>
    </div>
  </div>
  {generatedImages[i]?.imageUrl ? <div className="ce-generated">
    <div className="ce-generated-label">Generated asset · Qwen Image 2.1</div>
    <img src={generatedImages[i].imageUrl} alt={'Generated shot ' + (item?.shot || i + 1)} />
    <a href={generatedImages[i].imageUrl} target="_blank" rel="noreferrer">Open full image</a>
  </div> : null}
</article> })}</div></section> : null}
      {list(pack.testing_plan).length ? <section className="ce-section"><span>Testing plan</span>{list(pack.testing_plan, 10).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      {list(pack.follow_ups).length ? <section className="ce-section"><span>Next tests</span>{list(pack.follow_ups, 8).map((x, i) => <div key={i}>{renderItem(x)}</div>)}</section> : null}
      <div className="ce-actions"><button className="ce-secondary" onClick={() => setResult(null)}>New creator test</button></div>
    </>}
  </main>
}

const STYLE=`.creator-engine{color:var(--text);padding:46px 0 110px}.ce-kicker{font-size:10px;font-weight:900;letter-spacing:.18em;color:var(--accent)}.creator-engine h1{margin:10px 0 0;font-size:clamp(44px,6vw,78px);line-height:.9;letter-spacing:-.06em;max-width:12ch}.ce-lead{margin:18px 0 28px;max-width:820px;color:var(--text-2);font-size:14px;line-height:1.65}.ce-roster{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ce-roster button,.ce-objectives button{font:inherit;text-align:left;border:1px solid var(--line);background:var(--panel);color:var(--text);cursor:pointer;border-radius:6px}.ce-roster button{padding:18px;display:grid;gap:6px}.ce-roster b{font-size:25px}.ce-roster span,.ce-objectives span{color:var(--text-3);font-size:11px;line-height:1.4}.ce-roster .active,.ce-objectives .active{border-color:var(--accent);box-shadow:inset 3px 0 0 var(--accent)}.ce-objectives{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.ce-objectives button{padding:14px;display:grid;gap:6px}.ce-objectives b{font-size:12px}.ce-form{margin-top:16px;padding:20px;border:1px solid var(--line);background:var(--panel);display:grid;gap:14px}.ce-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ce-form label{display:grid;gap:7px;color:var(--text-3);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.ce-form input,.ce-form select,.ce-form textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--line-2);border-radius:6px;background:var(--panel-2);color:var(--text);font:inherit;text-transform:none;letter-spacing:normal}.ce-form textarea{min-height:120px;resize:vertical}.ce-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--text-3);font-size:12px;flex-wrap:wrap}.ce-primary,.ce-secondary{min-height:44px;padding:0 16px;border-radius:6px;font:inherit;font-weight:800;cursor:pointer}.ce-primary{border:0;background:var(--accent);color:#1a0f0c}.ce-secondary{border:1px solid var(--line-2);background:transparent;color:var(--text)}.ce-error{color:var(--bad);font-size:12px}.ce-recent{margin-top:20px}.ce-recent>b{font-size:12px}.ce-recent>div{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:11px}.ce-recent span{color:var(--text-3)}.ce-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0 12px}.ce-grid article,.ce-section{border:1px solid var(--line);background:var(--panel);padding:18px}.ce-grid span,.ce-section>span{display:block;color:var(--text-3);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.ce-grid b{display:block;margin-top:8px;font-size:14px;line-height:1.45}.ce-section{margin-top:10px}.ce-section div{padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:12px;line-height:1.5;white-space:pre-wrap}.ce-section div:last-child{border-bottom:0}.ce-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ce-two .ce-section{margin-top:10px}.ce-image-section{overflow:hidden}.ce-image-list{display:grid;gap:12px;margin-top:10px}.ce-image-card{padding:14px;border:1px solid var(--line);background:var(--panel-2)}.ce-image-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;font-size:12px}.ce-image-head b{font-size:14px}.ce-image-head span{color:var(--text-3);text-align:right;font-size:10px}.ce-image-meta{margin-top:8px;color:var(--text-3);font-size:10px;line-height:1.5}.ce-prompt-panel{margin-top:10px;border:1px solid var(--line);background:var(--panel)}.ce-prompt-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid var(--line);color:var(--text-3);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.ce-prompt-head button{border:1px solid var(--line-2);background:transparent;color:var(--text);border-radius:5px;padding:5px 8px;font:inherit;text-transform:none;letter-spacing:normal;cursor:pointer}.ce-prompt-panel pre{margin:0;max-height:520px;overflow:auto;padding:12px;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-2);white-space:pre-wrap}.ce-image-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid var(--line)}.ce-image-actions span{font-size:9px;color:var(--text-3)}.ce-qwen-button{min-height:38px;padding:0 12px;border:1px solid var(--accent);background:var(--accent-dim);color:var(--text);border-radius:5px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.ce-qwen-button:disabled{opacity:.5;cursor:default}.ce-generated{margin-top:10px;border:1px solid var(--line);background:var(--panel)}.ce-generated-label{padding:9px 10px;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3)}.ce-generated img{display:block;width:100%;max-width:520px;aspect-ratio:9/16;object-fit:cover;background:#07080c}.ce-generated a{display:inline-block;padding:9px 10px;color:var(--text);font-size:10px;text-decoration:none;border-top:1px solid var(--line);width:100%;box-sizing:border-box}.ce-flow-panel textarea{display:block;width:100%;min-height:180px;box-sizing:border-box;border:0;background:transparent;color:var(--text-2);padding:12px;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;outline:none}@media(max-width:900px){.ce-image-head{display:grid}.ce-image-head span{text-align:left}.ce-objectives{grid-template-columns:repeat(2,1fr)}.ce-grid{grid-template-columns:repeat(2,1fr)}.ce-two{grid-template-columns:1fr}}@media(max-width:650px){.ce-roster,.ce-objectives,.ce-grid,.ce-row{grid-template-columns:1fr}.ce-recent>div{display:grid}}`

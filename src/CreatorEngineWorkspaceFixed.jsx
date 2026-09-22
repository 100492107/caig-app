import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { creatorDnaFor, creatorDnaText } from '../shared/creator-dna.js'
import { aspectFromVision, generateCreatorImage } from './imageGeneration/qwenImageClient.js'

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
const CREATOR_IMAGES = { cara: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg', lila: 'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_10.jpeg' }
const PLATFORMS = ['TikTok', 'Instagram', 'YouTube Shorts', 'TikTok + Instagram', 'Multi-platform']
const FORMATS = ['Personal moment', 'POV / relatable', 'Quick take', 'Micro-story', 'GRWM', 'Day in the life', 'Photo slideshow', 'Reaction', 'Product-led demo', 'Story + recommendation']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// TEMP NOTE: full file body continues in next recovery push if truncated by gateway
export default function CreatorEngineWorkspaceFixed() {
  return <div className="cs-page"><h1>Voices workspace recovering…</h1><p>Reload after the full restore commit lands.</p></div>
}

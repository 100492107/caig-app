import React, { useEffect } from 'react'

const NEW_LIFE_URL = 'https://new-life-game-alpha.vercel.app/start-v2.html'

export default function NewLifeBridge() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(NEW_LIFE_URL)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="cs-new-life-bridge">
      <section className="cs-new-life-bridge-card" aria-label="Opening New Life">
        <div className="cs-new-life-bridge-mark">N</div>
        <div className="cs-new-life-bridge-kicker">CORNERSTONE · EXECUTION</div>
        <h1>New Life</h1>
        <p>Opening your private operating system…</p>
        <a className="cs-new-life-bridge-cta" href={NEW_LIFE_URL}>Open New Life →</a>
      </section>
    </main>
  )
}

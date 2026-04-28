/* ── CAIG LOGO ──────────────────────────────────────────────────
   C+A monogram mark — interlocking letterforms on a gold gradient
   square. C arc left, A strokes right, shared vertical rhythm.
   Works at 20px–80px. Gold on dark or light.
──────────────────────────────────────────────────────────────── */

export function LogoMark({ size = 32 }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="caig-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7B034" />
          <stop offset="100%" stopColor="#C97A00" />
        </linearGradient>
        <linearGradient id="caig-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background square */}
      <rect width="40" height="40" rx="10" fill="url(#caig-grad)" />
      <rect width="40" height="40" rx="10" fill="url(#caig-shine)" opacity="0.18" />

      {/* C — arc open to the right, left half */}
      <path
        d="M22 11 C14 11 10 14.5 10 20 C10 25.5 14 29 22 29"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* A — two legs + crossbar, right half */}
      <line x1="22" y1="29" x2="29" y2="11" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="29" y1="11" x2="36" y2="29" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="25" y1="22" x2="33" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({
  size = 32,
  showWordmark = true,
  sub = 'AI Content Systems',
  className = '',
}) {
  return (
    <div
      className={`caig-logo ${className}`}
      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
    >
      <LogoMark size={size} />
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: size * 0.5,
              letterSpacing: '-0.03em',
              color: 'var(--t0, #fff)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            Cornerstone AI Group
          </span>
          {sub && (
            <span
              style={{
                fontSize: size * 0.34,
                color: 'var(--t3, rgba(255,255,255,0.45))',
                letterSpacing: '0.01em',
                lineHeight: 1,
                fontWeight: 400,
              }}
            >
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

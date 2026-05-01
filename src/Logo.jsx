export function LogoMark({ size = 32 }) {
  return (
    <img
      src="/logo.png"
      alt="Cornerstone AI Group"
      width={size}
      height={size}
      style={{ flexShrink: 0, objectFit: 'contain', display: 'block' }}
    />
  )
}

export function Logo({ height = 36, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Cornerstone AI Group"
      height={height}
      style={{ display: 'block', objectFit: 'contain', flexShrink: 0 }}
      className={className}
    />
  )
}

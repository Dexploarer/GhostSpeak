/**
 * Simple 404 page for Pages Router compatibility
 * This is needed because Vercel's build process expects a /404 page
 * even when using App Router
 */
export default function Custom404() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
        <h1 style={{ 
          fontSize: '120px', 
          fontWeight: 900, 
          margin: 0,
          color: 'rgba(204, 255, 0, 0.2)',
          lineHeight: 1,
        }}>
          404
        </h1>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: '16px' }}>
          Page Not Found
        </h2>
        <p style={{ color: '#888', marginTop: '8px', marginBottom: '24px' }}>
          The page you are looking for does not exist.
        </p>
        <a 
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#ccff00',
            color: '#0a0a0a',
            fontWeight: 700,
            borderRadius: '12px',
            textDecoration: 'none',
          }}
        >
          Go Home
        </a>
        <div style={{
          marginTop: '32px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '999px',
          fontSize: '12px',
          color: '#888',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ccff00',
          }} />
          GhostSpeak • Devnet
        </div>
      </div>
    </div>
  )
}

/**
 * AuroraBackground
 * Renders the three animated gradient blobs that sit behind
 * every page. Import once in App.jsx — it's fixed-position so
 * it covers the full viewport regardless of scroll position.
 *
 * The blobs use CSS animations defined in index.css.
 */
const AuroraBackground = () => {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
    </div>
  )
}

export default AuroraBackground
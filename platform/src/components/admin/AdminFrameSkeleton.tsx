// What shows while the server checks who is signed in: the admin's own outline (sidebar, top bar,
// dashboard cards) as soft placeholders, so the real admin fills in where it will be instead of
// appearing on a blank page
export function AdminFrameSkeleton() {
  return (
    <div className="admin-shell" role="status" aria-busy="true">
      <span className="sr-only">Loading the admin…</span>
      <aside className="admin-side" aria-hidden="true">
        <span className="admin-logo">
          <span className="logo-mark">J</span>
          <span className="logo-text">
            Jay<strong>CVS</strong>
          </span>
          <span className="admin-badge">Admin</span>
        </span>
        <div className="skel-nav">
          {[70, 55, 62, 48, 66, 52, 58, 44].map((width, i) => (
            <span key={i} className="skel-nav-item">
              <i className="skel skel-dark skel-icon" />
              <i className="skel skel-dark" style={{ width: `${width}%` }} />
            </span>
          ))}
        </div>
      </aside>

      <div className="admin-main" aria-hidden="true">
        <header className="admin-top">
          <div className="skel-titles">
            <i className="skel" style={{ width: 90, height: 10 }} />
            <i className="skel" style={{ width: 150, height: 20 }} />
          </div>
          <div className="admin-top-actions">
            <i className="skel skel-avatar" />
          </div>
        </header>
        <main className="admin-content">
          <div className="skel-welcome">
            <i className="skel" style={{ width: "min(320px, 70%)", height: 26 }} />
            <i className="skel" style={{ width: "min(440px, 90%)", height: 12 }} />
          </div>
          <div className="skel-cards">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="panel skel-card">
                <i className="skel" style={{ width: "50%", height: 10 }} />
                <i className="skel" style={{ width: "70%", height: 24 }} />
              </div>
            ))}
          </div>
          <div className="skel-panels">
            {[5, 3].map((rows, i) => (
              <div key={i} className="panel skel-panel">
                <i className="skel" style={{ width: "40%", height: 14 }} />
                {Array.from({ length: rows }, (_, row) => (
                  <i key={row} className="skel" style={{ width: `${92 - row * 9}%`, height: 11 }} />
                ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

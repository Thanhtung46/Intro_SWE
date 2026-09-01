import { useEffect, useState } from 'react'
import { getPreferences, updatePreferences, type Preferences } from '../services/profileApi'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: checked ? 'var(--owner-blue)' : '#cbd5e1',
        position: 'relative',
        transition: 'background 0.15s',
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
        }}
      />
    </button>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid var(--owner-border)',
      }}
    >
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{label}</p>
        {hint && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--owner-text-muted)' }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export function OwnerSettingsPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPreferences()
      .then(setPrefs)
      .catch(() => setError('Could not load settings.'))
      .finally(() => setLoading(false))
  }, [])

  async function save(patch: Partial<Preferences>) {
    if (!prefs) return
    const optimistic = { ...prefs, ...patch }
    setPrefs(optimistic)
    setSaving(true)
    try {
      const updated = await updatePreferences(patch)
      setPrefs(updated)
    } catch {
      setPrefs(prefs)
      setError('Could not save that change.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Loading settings…</p>
  if (error && !prefs) return <p className="owner-error-text">{error}</p>
  if (!prefs) return null

  return (
    <>
      <div className="owner-page-header">
        <div>
          <h1>Settings</h1>
          <p>Language, appearance, and notification preferences.</p>
        </div>
      </div>

      <div className="owner-card" style={{ maxWidth: 560 }}>
        <Row label="Language" hint="Interface language">
          <select
            value={prefs.language}
            onChange={(e) => save({ language: e.target.value as Preferences['language'] })}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--owner-border)' }}
          >
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </Row>

        <Row label="Appearance" hint="Light, dark, or match your system">
          <select
            value={prefs.appearance}
            onChange={(e) => save({ appearance: e.target.value as Preferences['appearance'] })}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--owner-border)' }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </Row>

        <Row label="Push notifications" hint="Booking, cancellation, and match-starting alerts">
          <Toggle
            checked={prefs.pushNotificationsEnabled}
            onChange={(v) => save({ pushNotificationsEnabled: v })}
          />
        </Row>

        <Row label="Location services" hint="Used for map-based venue features">
          <Toggle
            checked={prefs.locationServicesEnabled}
            onChange={(v) => save({ locationServicesEnabled: v })}
          />
        </Row>

        {error && <p className="owner-error-text" style={{ marginTop: 12 }}>{error}</p>}
        {saving && <p style={{ fontSize: 12, color: 'var(--owner-text-muted)', marginTop: 12 }}>Saving…</p>}
      </div>
    </>
  )
}

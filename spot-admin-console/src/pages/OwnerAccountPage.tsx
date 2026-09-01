import { useEffect, useRef, useState, type FormEvent } from 'react'
import { changePassword, getMe, updateProfile, uploadAvatar, type UserProfile } from '../services/profileApi'
import { useAuthStore } from '../state/authStore'
import { validatePassword } from '../utils/authValidation'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function AvatarUploader({ user, onUploaded }: { user: UserProfile; onUploaded: (u: UserProfile) => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Avatar must be a JPEG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Avatar must be 2MB or smaller.')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const updated = await uploadAvatar(file)
      onUploaded(updated)
    } catch {
      setError('Could not upload the photo. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const initial = user.fullName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div>
      <div className="owner-avatar-row">
        {user.avatarUrl ? (
          <img className="owner-avatar-preview" src={user.avatarUrl} alt="" />
        ) : (
          <div className="owner-avatar-preview">{initial}</div>
        )}
        <div className="owner-avatar-actions">
          <button
            type="button"
            className="owner-btn owner-btn--secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <p className="owner-avatar-hint">JPEG, PNG, WebP, or GIF · up to 2MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="owner-error-text">{error}</p>}
    </div>
  )
}

function ProfileForm({ user, onSaved }: { user: UserProfile; onSaved: (u: UserProfile) => void }) {
  const [fullName, setFullName] = useState(user.fullName)
  const [gender, setGender] = useState(user.gender ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await updateProfile({ fullName, gender: gender || undefined })
      onSaved(updated)
      setSuccess(true)
    } catch {
      setError('Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="owner-card" onSubmit={handleSubmit}>
      <h2 className="owner-section-title" style={{ marginBottom: 16, fontSize: 20 }}>
        Profile
      </h2>

      <AvatarUploader user={user} onUploaded={onSaved} />

      <div className="owner-field">
        <label htmlFor="email">Email</label>
        <input id="email" value={user.email} disabled />
      </div>
      <div className="owner-field">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" value={user.phoneNumber ?? ''} disabled />
      </div>
      <div className="owner-field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div className="owner-field">
        <label htmlFor="gender">Gender</label>
        <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">Not set</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {error && <p className="owner-error-text">{error}</p>}
      {success && <p style={{ color: 'var(--owner-green)', fontSize: 13 }}>Profile updated.</p>}

      <button className="owner-btn" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setSaving(true)
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword })
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError('Could not change your password. Check your current password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="owner-card" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <h2 className="owner-section-title" style={{ marginBottom: 16, fontSize: 20 }}>
        Change Password
      </h2>

      <div className="owner-field">
        <label htmlFor="currentPassword">Current password</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="owner-field">
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div className="owner-field">
        <label htmlFor="confirmNewPassword">Confirm new password</label>
        <input
          id="confirmNewPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="owner-error-text">{error}</p>}
      {success && <p style={{ color: 'var(--owner-green)', fontSize: 13 }}>Password changed.</p>}

      <button className="owner-btn" type="submit" disabled={saving}>
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}

export function OwnerAccountPage() {
  const authUser = useAuthStore((s) => s.user)
  const setAuthUser = useAuthStore((s) => s.login)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setError('Could not load your account.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading account…</p>
  if (error) return <p className="owner-error-text">{error}</p>
  if (!user) return null

  return (
    <>
      <div className="owner-page-header">
        <div>
          <h1>Account</h1>
          <p>Manage your personal information and security.</p>
        </div>
      </div>

      <div style={{ maxWidth: 480 }}>
        <ProfileForm
          user={user}
          onSaved={(updated) => {
            setUser(updated)
            const token = useAuthStore.getState().accessToken
            if (token && authUser) {
              setAuthUser(token, { ...authUser, fullName: updated.fullName, avatarUrl: updated.avatarUrl })
            }
          }}
        />
        <ChangePasswordForm />
      </div>
    </>
  )
}

import { apiClient } from './apiClient'

export interface UserProfile {
  userId: string
  email: string
  fullName: string
  phoneNumber?: string
  role: string
  status: string
  gender?: string
  avatarUrl: string | null
  language: 'en' | 'vi'
  appearance: 'light' | 'dark' | 'system'
  pushNotificationsEnabled: boolean
  locationServicesEnabled: boolean
}

export async function getMe() {
  const { data } = await apiClient.get<{ user: UserProfile }>('/users/me')
  return data.user
}

export async function updateProfile(payload: { fullName?: string; gender?: string }) {
  const { data } = await apiClient.patch<{ user: UserProfile }>('/users/me', payload)
  return data.user
}

export async function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('avatar', file)
  // No explicit Content-Type here — the browser must set it (with the
  // multipart boundary) itself; overriding it strips the boundary and
  // multer fails to parse the body.
  const { data } = await apiClient.post<{ user: UserProfile }>('/users/me/avatar', form)
  return data.user
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}) {
  await apiClient.post('/users/me/password', payload)
}

export interface Preferences {
  language: 'en' | 'vi'
  appearance: 'light' | 'dark' | 'system'
  pushNotificationsEnabled: boolean
  locationServicesEnabled: boolean
}

export async function getPreferences() {
  const { data } = await apiClient.get<{ preferences: Preferences }>('/users/me/preferences')
  return data.preferences
}

export async function updatePreferences(patch: Partial<Preferences>) {
  const { data } = await apiClient.patch<{ preferences: Preferences }>('/users/me/preferences', patch)
  return data.preferences
}

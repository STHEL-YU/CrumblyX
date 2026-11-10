export async function logoutStaff() {
  const response = await fetch('/api/staff-auth/logout', { method: 'POST' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not log out.')
}

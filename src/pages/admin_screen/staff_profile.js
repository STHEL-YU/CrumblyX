import { useCallback, useEffect, useRef, useState } from 'react'

export function useStaffProfile() {
  const [profileOpen, setProfileOpen] = useState(false)
  const triggerRef = useRef(null)
  const wasOpen = useRef(false)

  const openProfile = useCallback((event) => {
    triggerRef.current = event.currentTarget
    setProfileOpen(true)
  }, [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])

  useEffect(() => {
    if (profileOpen) {
      wasOpen.current = true
    } else if (wasOpen.current) {
      wasOpen.current = false
      triggerRef.current?.focus()
    }
  }, [profileOpen])

  return { profileOpen, openProfile, closeProfile }
}

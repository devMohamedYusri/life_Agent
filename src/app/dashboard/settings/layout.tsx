// app/dashboard/settings/layout.tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Settings - Life Manager',
  description: 'Manage your account settings and preferences',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
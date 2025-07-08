// app/components/userAvatar.tsx
"use client"

import React from 'react'
import Image from 'next/image'

interface UserAvatarProps {
  avatarUrl?: string | null;
  size?: number; // Size in pixels, default to 40
  className?: string; // Additional Tailwind CSS classes
}

export const UserAvatar = React.memo(function UserAvatar({ avatarUrl, size = 40, className }: UserAvatarProps) {
  const src = avatarUrl || '/default-avatar.png'

  return (
    <Image
      src={src}
      alt="User Avatar"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      priority={true} // Prioritize loading for a better LCP
    />
  )
})
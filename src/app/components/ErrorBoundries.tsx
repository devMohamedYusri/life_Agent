// app/components/ErrorBoundary.tsx
'use client'

export default function ErrorBoundary({
  // error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
        <button
          onClick={reset}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
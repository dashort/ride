"use client"
import { Card, Headline } from "@acme/ui"

export function SharedExample() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-gray-200 p-6">
        <Headline>Shared UI in Web</Headline>
        <p className="mt-2 text-gray-600">This component is imported from packages/ui.</p>
      </div>
    </div>
  )
}

import { SharedExample } from "../components/SharedExample"

export default function Page() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Web + Mobile Monorepo</h1>
        <p className="mt-3 text-gray-600">Next.js (web) + Expo (mobile) with shared packages.</p>
        <div className="mt-6">
          <SharedExample />
        </div>
      </div>
    </main>
  )
}

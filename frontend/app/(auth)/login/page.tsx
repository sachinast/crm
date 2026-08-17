export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-lg border p-6">
        <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-500">
          Auth wiring lands in Phase 1 (JWT via FastAPI, see docs/TECHNICAL_SPEC.md §4/§6).
        </p>
      </div>
    </main>
  );
}

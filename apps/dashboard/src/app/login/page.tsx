'use client';

export default function LoginPage() {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <span className="text-2xl">🌙</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Lunaria</h1>
          <p className="mt-1 text-sm text-zinc-400">Discord Community Management</p>
        </div>

        <a
          href={`${apiBase}/api/v1/auth/login`}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <svg className="h-5 w-5" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
            <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.5 37.5 0 0 0 25.5.5a.2.2 0 0 0-.2-.1A58.3 58.3 0 0 0 10.7 4.9C10.7 5 .4 18.1.4 30.9c0 .2 0 .3.1.4a58.7 58.7 0 0 0 17.7 9 .2.2 0 0 0 .3-.1c1.4-1.9 2.6-3.8 3.6-5.9a.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.8a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0c.4.3.7.5 1.1.8a.2.2 0 0 1 0 .4 36.1 36.1 0 0 1-5.5 2.6.2.2 0 0 0-.1.3c1.1 2 2.3 4 3.7 5.9a.2.2 0 0 0 .3.1 58.5 58.5 0 0 0 17.7-9 .4.4 0 0 0 .2-.4C70.6 18.1 60.3 5 60.1 4.9z" />
          </svg>
          Sign in with Discord
        </a>

        <p className="mt-6 text-center text-xs text-zinc-500">
          You must be a server manager to access the dashboard.
        </p>
      </div>
    </div>
  );
}

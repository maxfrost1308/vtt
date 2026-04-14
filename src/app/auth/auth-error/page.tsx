import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-zinc-100 mb-3">Something went wrong</h1>
        <p className="text-zinc-400 mb-6">
          An error occurred while signing in. Please try again.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-full transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}

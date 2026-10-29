import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">BeautyLink</p>
      <h1 className="mt-3 font-display text-4xl">This page isn’t available</h1>
      <p className="mt-3 max-w-sm text-muted">The link may be mistyped, or the business hasn’t published their page yet.</p>
      <Link href="/" className="btn-secondary mt-8">Go to BeautyLink</Link>
    </main>
  );
}

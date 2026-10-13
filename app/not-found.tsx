import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-2xl font-bold text-stone-900 mb-2">Page Not Found</h2>
      <p className="text-sm text-stone-500 mb-6 max-w-sm">
        The bakery page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

import Link from 'next/link';

interface AuthorBylineProps {
  lastUpdated?: string;
}

export function AuthorByline({ lastUpdated }: AuthorBylineProps) {
  const dateStr = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 mt-2 mb-6">
      <span>
        By <span className="font-medium text-slate-700">James Lane</span>
      </span>
      <span className="text-slate-300">·</span>
      <span>Car enthusiast &amp; founder</span>
      {dateStr && (
        <>
          <span className="text-slate-300">·</span>
          <span>Updated {dateStr}</span>
        </>
      )}
      <span className="text-slate-300">·</span>
      <Link href="/methodology" className="hover:text-slate-700 hover:underline">
        How we calculate
      </Link>
    </div>
  );
}

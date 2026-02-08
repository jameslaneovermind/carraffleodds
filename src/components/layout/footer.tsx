import Link from 'next/link';
import { Logo } from '@/components/logo';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Logo />
            </div>
            <p className="text-sm text-slate-500">
              Your trusted source for car raffle odds comparison across the UK.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Browse</h3>
            <ul className="space-y-2">
              <li><Link href="/raffles" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">All Raffles</Link></li>
              <li><Link href="/raffles/cars" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Car Raffles</Link></li>
              <li><Link href="/raffles/cash" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Cash Raffles</Link></li>
              <li><Link href="/raffles/tech" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Tech Raffles</Link></li>
              <li><Link href="/raffles/watches" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Watch Raffles</Link></li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Learn</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">About</Link></li>
              <li><Link href="/how-it-works" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">How It Works</Link></li>
              <li><Link href="/ending-soon" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Ending Soon</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/responsible-gambling" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Responsible Gambling</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-8">
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} CarRaffleOdds. We may earn commission from affiliate links. 18+ only. Not gambling advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

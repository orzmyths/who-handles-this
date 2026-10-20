import { ReactNode } from 'react';
import { Link } from 'wouter';
import { ShieldCheck } from 'lucide-react';
import { AccountControls } from './AccountControls';

export function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-2 text-sm text-center font-medium">
        Simulated staff view for demonstration. No real staff are monitoring this prototype.
      </div>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <AccountControls />
        <h1 className="font-serif text-xl font-medium flex items-center gap-2">
          <ShieldCheck size={20} className="text-slate-500" /> Staff Review (Simulated)
        </h1>
        <Link href="/staff" className="text-sm text-blue-600 hover:underline">
          Queue
        </Link>
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, FileText, Receipt, LineChart, ShieldCheck } from 'lucide-react';

interface UserOption {
  id: string;
  name: string;
  role: string;
}

export function Navbar({ users, activeUserId }: { users: UserOption[]; activeUserId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserId = searchParams.get('userId') || activeUserId;

  const handleRoleChange = (newUserId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('userId', newUserId);
    router.push(`?${params.toString()}`);
  };

  const query = currentUserId ? `?userId=${currentUserId}` : '';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href={`/${query}`} className="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <Wallet className="w-6 h-6" />
            <span>CashPilot</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link href={`/${query}`} className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
              Dashboard & Prévisions
            </Link>
            <Link href={`/factures${query}`} className="px-3 py-2 rounded-md hover:bg-slate-800 transition flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Factures & Encaissements
            </Link>
            <Link href={`/depenses${query}`} className="px-3 py-2 rounded-md hover:bg-slate-800 transition flex items-center gap-1.5">
              <Receipt className="w-4 h-4" /> Dépenses & Validation
            </Link>
            <Link href={`/simulation${query}`} className="px-3 py-2 rounded-md bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition flex items-center gap-1.5">
              <LineChart className="w-4 h-4" /> Simulateur What-If
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <select
            value={currentUserId}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-transparent text-xs sm:text-sm text-slate-100 focus:outline-none cursor-pointer"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id} className="bg-slate-900">
                {u.name} — [{u.role}]
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
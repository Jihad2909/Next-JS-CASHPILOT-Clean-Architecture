'use client';

import { useState, useTransition } from 'react';
import { recordInvoicePayment } from '@/app/actions/financeActions';

export function InvoicePaymentButton({
  invoiceId,
  remainingAmount,
  userId,
}: {
  invoiceId: string;
  remainingAmount: number;
  userId: string;
}) {
  const [amount, setAmount] = useState(remainingAmount.toString());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await recordInvoicePayment({
          invoiceId,
          amount: parseFloat(amount),
          method: 'VIREMENT',
          userId,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l’encaissement');
      }
    });
  };

  return (
    <form onSubmit={handlePay} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 border border-slate-300 rounded px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? '...' : 'Encaisser'}
        </button>
      </div>
      {error && <span className="text-[11px] text-red-600 font-medium">{error}</span>}
    </form>
  );
}
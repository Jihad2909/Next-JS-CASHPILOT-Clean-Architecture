'use client';

import { useState, useTransition } from 'react';
import { reviewExpense, markExpenseAsPaid } from '@/app/actions/financeActions';
import { ExpenseStatus } from '@prisma/client';

export function ExpenseWorkflowButtons({
  expenseId,
  status,
  userId,
}: {
  expenseId: string;
  status: ExpenseStatus;
  userId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReview = (decision: 'APPROUVEE' | 'REFUSEE') => {
    setError(null);
    startTransition(async () => {
      try {
        await reviewExpense({ expenseId, userId, decision });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Action non autorisée');
      }
    });
  };

  const handlePay = () => {
    setError(null);
    startTransition(async () => {
      try {
        await markExpenseAsPaid({ expenseId, userId });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Action bloquée');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === ExpenseStatus.EN_ATTENTE && (
          <>
            <button
              onClick={() => handleReview('APPROUVEE')}
              disabled={isPending}
              className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-medium hover:bg-emerald-700"
            >
              Approuver
            </button>
            <button
              onClick={() => handleReview('REFUSEE')}
              disabled={isPending}
              className="bg-rose-600 text-white px-2.5 py-1 rounded text-xs font-medium hover:bg-rose-700"
            >
              Refuser
            </button>
          </>
        )}
        {status === ExpenseStatus.APPROUVEE && (
          <button
            onClick={handlePay}
            disabled={isPending}
            className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-medium hover:bg-slate-800"
          >
            Enregistrer Paiement
          </button>
        )}
      </div>
      {error && <span className="text-[11px] text-red-600 font-medium">{error}</span>}
    </div>
  );
}
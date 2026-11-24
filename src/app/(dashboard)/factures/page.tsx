import { Suspense } from 'react';
import { prisma } from '@/infrastructure/database/prisma';
import { InvoicePaymentButton } from '@/presentation/features/InvoicePaymentButton';
import { InvoiceStatus } from '@prisma/client';

async function FacturesContent({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId } = await searchParams;
  const fallbackUser = await prisma.user.findFirst();
  const activeUserId = userId ?? fallbackUser?.id ?? '';

  const invoices = await prisma.invoice.findMany({
    include: { contact: true, project: true },
    orderBy: { dueDate: 'asc' },
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facturation & Encaissements</h1>
        <p className="text-sm text-slate-600">Suivi des factures clients, paiements partiels et calcul du reste à payer.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">N° Facture</th>
              <th className="px-4 py-3">Client / Projet</th>
              <th className="px-4 py-3">Échéance</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Encaissé</th>
              <th className="px-4 py-3">Reste à payer</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Encaissement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoices.map((inv) => {
              const total = Number(inv.totalAmount);
              const paid = Number(inv.paidAmount);
              const remaining = Number((total - paid).toFixed(3));
              const canPay =
                inv.status === InvoiceStatus.VALIDEE || inv.status === InvoiceStatus.PARTIELLEMENT_PAYEE;

              return (
                <tr key={inv.id}>
                  <td className="px-4 py-3 font-bold">{inv.number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{inv.contact.name}</div>
                    {inv.project && <div className="text-xs text-slate-500">{inv.project.name}</div>}
                  </td>
                  <td className="px-4 py-3">{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">{total.toFixed(3)} DT</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{paid.toFixed(3)} DT</td>
                  <td className="px-4 py-3 font-bold text-amber-700">{remaining.toFixed(3)} DT</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100">{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canPay ? (
                      <InvoicePaymentButton invoiceId={inv.id} remainingAmount={remaining} userId={activeUserId} />
                    ) : (
                      <span className="text-xs text-slate-400">Soldée</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FacturesPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-6 text-slate-500">Chargement des factures...</div>}>
      <FacturesContent searchParams={searchParams} />
    </Suspense>
  );
}
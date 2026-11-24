import { Suspense } from 'react';
import { prisma } from '@/infrastructure/database/prisma';
import { WhatIfSimulator } from '@/presentation/features/WhatIfSimulator';
import { InvoiceStatus, ExpenseStatus } from '@prisma/client';

async function SimulationContent() {
  const enterprise = await prisma.enterprise.findFirst({
    include: {
      invoices: {
        where: { status: { in: [InvoiceStatus.VALIDEE, InvoiceStatus.PARTIELLEMENT_PAYEE] } },
        include: { contact: true },
      },
      expenses: { where: { status: ExpenseStatus.APPROUVEE } },
    },
  });

  if (!enterprise) return <div className="p-8 text-center">Aucune entreprise trouvée.</div>;

  const inflows = enterprise.invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.number,
    clientName: inv.contact.name,
    remainingAmount: Number(inv.totalAmount) - Number(inv.paidAmount),
    dueDate: inv.dueDate,
  }));

  const outflows = enterprise.expenses.map((exp) => ({
    id: exp.id,
    title: exp.title,
    amount: Number(exp.amount),
    expectedDate: exp.expectedDate,
  }));

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Simulateur de Trésorerie &ldquo;What-If&rdquo;</h1>
        <p className="text-sm text-slate-600">
          Entreprise : <strong>{enterprise.name}</strong> ({enterprise.sector}) — Solde réel actuel :{' '}
          <strong className="text-emerald-700">{Number(enterprise.currentBalance).toFixed(3)} DT</strong>
        </p>
      </div>

      <WhatIfSimulator
        currentBalance={Number(enterprise.currentBalance)}
        inflows={inflows}
        outflows={outflows}
      />
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-6 text-slate-500">Chargement du simulateur...</div>}>
      <SimulationContent />
    </Suspense>
  );
}
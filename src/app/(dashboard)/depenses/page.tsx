import { Suspense } from 'react';
import { prisma } from '@/infrastructure/database/prisma';
import { ExpenseWorkflowButtons } from '@/presentation/features/ExpenseWorkflowButtons';

async function DepensesContent({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId } = await searchParams;
  const fallbackUser = await prisma.user.findFirst();
  const activeUserId = userId ?? fallbackUser?.id ?? '';

  const expenses = await prisma.expense.findMany({
    include: { submittedBy: true, project: true },
    orderBy: { expectedDate: 'asc' },
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dépenses & Circuit de Validation</h1>
        <p className="text-sm text-slate-600">
          Soumission par les collaborateurs, approbation par le Dirigeant, puis décaissement traçable.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Libellé / Projet</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Soumis par</th>
              <th className="px-4 py-3">Date prévue</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Workflow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td className="px-4 py-3">
                  <div className="font-bold">{exp.title}</div>
                  {exp.project && <div className="text-xs text-slate-500">{exp.project.name}</div>}
                </td>
                <td className="px-4 py-3">{exp.category}</td>
                <td className="px-4 py-3 text-xs">{exp.submittedBy.name}</td>
                <td className="px-4 py-3">{new Date(exp.expectedDate).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3 font-bold text-rose-700">{Number(exp.amount).toFixed(3)} DT</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100">{exp.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ExpenseWorkflowButtons expenseId={exp.id} status={exp.status} userId={activeUserId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DepensesPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-6 text-slate-500">Chargement des dépenses...</div>}>
      <DepensesContent searchParams={searchParams} />
    </Suspense>
  );
}
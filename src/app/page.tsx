import { prisma } from '@/infrastructure/database/prisma';
import { CashForecastEngine } from '@/domain/services/CashForecastEngine';
import { InvoiceStatus, ExpenseStatus } from '@prisma/client';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Briefcase, Clock, Wallet } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId } = await searchParams;
  const enterprise = await prisma.enterprise.findFirst({
    include: {
      invoices: { include: { contact: true, project: true } },
      expenses: { include: { project: true } },
      projects: true,
      cashMovements: { orderBy: { date: 'desc' }, take: 10 },
    },
  });

  if (!enterprise) return <div className="p-8 text-center">Aucune entreprise trouvée.</div>;

  const today = new Date();
  const unpaidInvoices = enterprise.invoices.filter(
    (i) => i.status === InvoiceStatus.VALIDEE || i.status === InvoiceStatus.PARTIELLEMENT_PAYEE
  );
  const overdueInvoices = unpaidInvoices.filter((i) => new Date(i.dueDate) < today);
  const pendingExpenses = enterprise.expenses.filter((e) => e.status === ExpenseStatus.EN_ATTENTE);
  const approvedExpenses = enterprise.expenses.filter((e) => e.status === ExpenseStatus.APPROUVEE);

  const expectedInflowsTotal = unpaidInvoices.reduce(
    (sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)),
    0
  );
  const expectedOutflowsTotal = approvedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const forecast30 = CashForecastEngine.generateForecast({
    currentBalance: Number(enterprise.currentBalance),
    startDate: today,
    horizonDays: 30,
    inflows: unpaidInvoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.number,
      clientName: i.contact.name,
      remainingAmount: Number(i.totalAmount) - Number(i.paidAmount),
      dueDate: i.dueDate,
    })),
    outflows: approvedExpenses.map((e) => ({
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      expectedDate: e.expectedDate,
    })),
  });

  const negativeAlert = forecast30.find((p) => p.isNegative);
  const projected30Balance = forecast30[forecast30.length - 1]?.projectedBalance ?? Number(enterprise.currentBalance);
  const query = userId ? `?userId=${userId}` : '';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{enterprise.name}</h1>
          <p className="text-sm text-slate-500">Secteur : {enterprise.sector} • Tableau de bord de trésorerie</p>
        </div>
        <Link
          href={`/simulation${query}`}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          Lancer une simulation What-If →
        </Link>
      </div>

      <div className="space-y-2">
        {negativeAlert && (
          <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>
              <strong>Alerte Trésorerie :</strong> Solde prévisionnel négatif ({negativeAlert.projectedBalance.toFixed(3)} DT) prévu le <strong>{negativeAlert.date}</strong>.
            </span>
          </div>
        )}
        {pendingExpenses.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span><strong>{pendingExpenses.length} dépense(s)</strong> en attente d&apos;approbation.</span>
            </div>
            <Link href={`/depenses${query}`} className="underline font-semibold">Examiner →</Link>
          </div>
        )}
        {overdueInvoices.length > 0 && (
          <div className="bg-orange-50 border border-orange-300 text-orange-900 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
            <span><strong>{overdueInvoices.length} facture(s)</strong> en retard de paiement.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase">
            <span>Trésorerie Réelle</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{Number(enterprise.currentBalance).toFixed(3)} DT</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase">
            <span>Encaissements Attendus</span>
            <ArrowDownLeft className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-700 mt-2">+{expectedInflowsTotal.toFixed(3)} DT</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase">
            <span>Décaissements Prévus</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">-{expectedOutflowsTotal.toFixed(3)} DT</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase">
            <span>Prévisionnel à J+30</span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${projected30Balance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {projected30Balance.toFixed(3)} DT
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <h2>Trésorerie par Projet Client (Agence Digitale)</h2>
          </div>
          <div className="space-y-3">
            {enterprise.projects.map((proj) => {
              const billed = enterprise.invoices
                .filter((i) => i.projectId === proj.id && i.status !== InvoiceStatus.ANNULEE)
                .reduce((s, i) => s + Number(i.paidAmount), 0);
              const spent = enterprise.expenses
                .filter((e) => e.projectId === proj.id && e.status !== ExpenseStatus.REFUSEE)
                .reduce((s, e) => s + Number(e.amount), 0);
              const netCash = billed - spent;

              return (
                <div key={proj.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>{proj.name}</span>
                    <span className={netCash >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                      Cash Net : {netCash.toFixed(3)} DT
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>Budget : {Number(proj.budget).toFixed(3)} DT</span>
                    <span>Encaissé : {billed.toFixed(3)} DT | Dépenses engagées : {spent.toFixed(3)} DT</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-800">Journal des Mouvements de Trésorerie Réels</h2>
          <div className="divide-y divide-slate-100">
            {enterprise.cashMovements.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800">{m.description}</p>
                  <p className="text-xs text-slate-400">{new Date(m.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`font-bold ${m.type === 'DECAISSEMENT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {m.type === 'DECAISSEMENT' ? '-' : '+'}
                  {Number(m.amount).toFixed(3)} DT
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
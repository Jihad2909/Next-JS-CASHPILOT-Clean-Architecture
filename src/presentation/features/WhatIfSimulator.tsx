'use client';

import { useState, useMemo } from 'react';
import { CashForecastEngine } from '@/domain/services/CashForecastEngine';
import { ExpectedInflow, ExpectedOutflow } from '@/domain/entities/FinanceTypes';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { AlertTriangle, PlusCircle, RotateCcw } from 'lucide-react';

interface Props {
  currentBalance: number;
  inflows: ExpectedInflow[];
  outflows: ExpectedOutflow[];
}

export function WhatIfSimulator({ currentBalance, inflows, outflows }: Props) {
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(30);
  const [invoiceDelays, setInvoiceDelays] = useState<Record<string, number>>({});
  const [extraExpenseTitle, setExtraExpenseTitle] = useState('');
  const [extraExpenseAmount, setExtraExpenseAmount] = useState('');
  const [extraExpenseDays, setExtraExpenseDays] = useState('10');
  const [extraExpenses, setExtraExpenses] = useState<Array<{ title: string; amount: number; date: Date }>>([]);

  const { baseline, simulated, mergedChartData, firstNegativeDay } = useMemo(() => {
    const startDate = new Date();

    const basePoints = CashForecastEngine.generateForecast({
      currentBalance,
      startDate,
      horizonDays,
      inflows,
      outflows,
    });

    const simPoints = CashForecastEngine.generateForecast({
      currentBalance,
      startDate,
      horizonDays,
      inflows,
      outflows,
      simulation: { invoiceDelays, extraExpenses },
    });

    const merged = basePoints.map((bp, idx) => ({
      date: bp.date.slice(5),
      Initial: bp.projectedBalance,
      Simule: simPoints[idx]?.projectedBalance ?? bp.projectedBalance,
    }));

    return {
      baseline: basePoints,
      simulated: simPoints,
      mergedChartData: merged,
      firstNegativeDay: simPoints.find((p) => p.isNegative),
    };
  }, [currentBalance, horizonDays, inflows, outflows, invoiceDelays, extraExpenses]);

  const handleAddSimulatedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(extraExpenseAmount);
    const days = parseInt(extraExpenseDays, 10) || 0;
    if (!extraExpenseTitle || isNaN(amount) || amount <= 0) return;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    setExtraExpenses((prev) => [...prev, { title: extraExpenseTitle, amount, date: targetDate }]);
    setExtraExpenseTitle('');
    setExtraExpenseAmount('');
  };

  const finalInitial = baseline[baseline.length - 1]?.projectedBalance ?? currentBalance;
  const finalSimulated = simulated[simulated.length - 1]?.projectedBalance ?? currentBalance;

  return (
    <div className="space-y-6">
      {firstNegativeDay && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">
              Alerte de trésorerie négative détectée le {firstNegativeDay.date} !
            </h3>
            <p className="text-sm text-red-800">
              Solde prévisionnel simulé : <strong>{firstNegativeDay.projectedBalance.toFixed(3)} DT</strong>.
              {firstNegativeDay.events.length > 0 && (
                <span> Cause : {firstNegativeDay.events.join(' | ')}</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">1. Simuler un retard d&apos;encaissement client</h3>
            <button
              onClick={() => { setInvoiceDelays({}); setExtraExpenses([]); }}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          </div>

          {inflows.map((inv) => {
            const delay = invoiceDelays[inv.id] ?? 0;
            return (
              <div key={inv.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-800">{inv.invoiceNumber} — {inv.clientName}</span>
                  <span className="font-bold text-emerald-700">{inv.remainingAmount.toFixed(3)} DT</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-600 shrink-0">Retard : +{delay} jours</label>
                  <input
                    type="range"
                    min={0}
                    max={45}
                    step={5}
                    value={delay}
                    onChange={(e) => setInvoiceDelays((prev) => ({ ...prev, [inv.id]: Number(e.target.value) }))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800">2. Tester une dépense imprévue (Hypothèse)</h3>
          <form onSubmit={handleAddSimulatedExpense} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Ex: Achat serveur"
              value={extraExpenseTitle}
              onChange={(e) => setExtraExpenseTitle(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.001"
              placeholder="Montant (DT)"
              value={extraExpenseAmount}
              onChange={(e) => setExtraExpenseAmount(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={90}
                value={extraExpenseDays}
                onChange={(e) => setExtraExpenseDays(e.target.value)}
                className="w-20 border border-slate-300 rounded-lg px-2 py-2 text-sm"
              />
              <button
                type="submit"
                className="flex-1 bg-slate-900 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </form>

          {extraExpenses.length > 0 && (
            <ul className="text-xs space-y-1 text-slate-700">
              {extraExpenses.map((ex, i) => (
                <li key={i} className="flex justify-between bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
                  <span>{ex.title} ({ex.date.toISOString().split('T')[0]})</span>
                  <span className="font-semibold text-red-700">-{ex.amount.toFixed(3)} DT</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Comparaison : Prévision Initiale vs Scénario Simulé</h3>
            <p className="text-xs text-slate-500">
              Solde à J+{horizonDays} : <strong>Initial = {finalInitial.toFixed(3)} DT</strong> |{' '}
              <strong className={finalSimulated < 0 ? 'text-red-600' : 'text-emerald-600'}>
                Simulé = {finalSimulated.toFixed(3)} DT
              </strong>
            </p>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {([30, 60, 90] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizonDays(h)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  horizonDays === h ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                {h} jours
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="Initial" name="Prévision Initiale (DT)" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Simule" name="Scénario What-If (DT)" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
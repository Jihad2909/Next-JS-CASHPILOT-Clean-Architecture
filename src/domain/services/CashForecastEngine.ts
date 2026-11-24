import {
  ExpectedInflow,
  ExpectedOutflow,
  ForecastPoint,
  SimulationOverrides,
} from '../entities/FinanceTypes';

export class CashForecastEngine {
  private static toMillimes(amount: number): number {
    return Math.round(amount * 1000);
  }

  private static fromMillimes(millimes: number): number {
    return Number((millimes / 1000).toFixed(3));
  }

  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private static toDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  public static generateForecast(params: {
    currentBalance: number;
    startDate: Date;
    horizonDays: 30 | 60 | 90;
    inflows: ExpectedInflow[];
    outflows: ExpectedOutflow[];
    simulation?: SimulationOverrides;
  }): ForecastPoint[] {
    const { currentBalance, startDate, horizonDays, inflows, outflows, simulation } = params;
    const endDate = this.addDays(startDate, horizonDays);

    const timelineEvents: Array<{ dateKey: string; deltaMillimes: number; label: string }> = [];

    for (const inv of inflows) {
      if (inv.remainingAmount <= 0) continue;
      const delayDays = simulation?.invoiceDelays?.[inv.id] ?? 0;
      const effectiveDate = this.addDays(new Date(inv.dueDate), delayDays);

      timelineEvents.push({
        dateKey: this.toDateKey(effectiveDate),
        deltaMillimes: this.toMillimes(inv.remainingAmount),
        label: `+${inv.remainingAmount.toFixed(3)} DT (Facture ${inv.invoiceNumber} - ${inv.clientName}${delayDays > 0 ? ` [Retard +${delayDays}j]` : ''})`,
      });
    }

    if (simulation?.extraInflows) {
      for (const extra of simulation.extraInflows) {
        timelineEvents.push({
          dateKey: this.toDateKey(new Date(extra.date)),
          deltaMillimes: this.toMillimes(extra.amount),
          label: `+${extra.amount.toFixed(3)} DT ([Simulé] ${extra.title})`,
        });
      }
    }

    for (const exp of outflows) {
      timelineEvents.push({
        dateKey: this.toDateKey(new Date(exp.expectedDate)),
        deltaMillimes: -this.toMillimes(exp.amount),
        label: `-${exp.amount.toFixed(3)} DT (Dépense: ${exp.title})`,
      });
    }

    if (simulation?.extraExpenses) {
      for (const extra of simulation.extraExpenses) {
        timelineEvents.push({
          dateKey: this.toDateKey(new Date(extra.date)),
          deltaMillimes: -this.toMillimes(extra.amount),
          label: `-${extra.amount.toFixed(3)} DT ([Simulé] ${extra.title})`,
        });
      }
    }

    let runningBalanceMillimes = this.toMillimes(currentBalance);
    const points: ForecastPoint[] = [];
    const startKey = this.toDateKey(startDate);

    const overdueEvents = timelineEvents.filter((e) => e.dateKey < startKey);
    for (const ev of overdueEvents) {
      runningBalanceMillimes += ev.deltaMillimes;
    }

    for (let day = 0; day <= horizonDays; day++) {
      const currentDate = this.addDays(startDate, day);
      if (currentDate > endDate) break;

      const dateKey = this.toDateKey(currentDate);
      const dayEvents = timelineEvents.filter((e) => e.dateKey === dateKey);

      let inflowsToday = 0;
      let outflowsToday = 0;
      const labels: string[] = [];

      if (day === 0 && overdueEvents.length > 0) {
        overdueEvents.forEach((e) => {
          if (e.deltaMillimes > 0) inflowsToday += e.deltaMillimes;
          else outflowsToday += Math.abs(e.deltaMillimes);
          labels.push(`[Échu] ${e.label}`);
        });
      }

      for (const ev of dayEvents) {
        runningBalanceMillimes += ev.deltaMillimes;
        if (ev.deltaMillimes > 0) inflowsToday += ev.deltaMillimes;
        else outflowsToday += Math.abs(ev.deltaMillimes);
        labels.push(ev.label);
      }

      const balance = this.fromMillimes(runningBalanceMillimes);
      points.push({
        date: dateKey,
        projectedBalance: balance,
        inflowsOnDate: this.fromMillimes(inflowsToday),
        outflowsOnDate: this.fromMillimes(outflowsToday),
        isNegative: balance < 0,
        events: labels,
      });
    }

    return points;
  }
}
export type UserRole = 'DIRIGEANT' | 'GESTIONNAIRE_FINANCIER' | 'COLLABORATEUR';

export interface ExpectedInflow {
  id: string;
  invoiceNumber: string;
  clientName: string;
  remainingAmount: number;
  dueDate: Date;
}

export interface ExpectedOutflow {
  id: string;
  title: string;
  amount: number;
  expectedDate: Date;
}

export interface SimulationOverrides {
  invoiceDelays?: Record<string, number>;
  extraExpenses?: Array<{ title: string; amount: number; date: Date }>;
  extraInflows?: Array<{ title: string; amount: number; date: Date }>;
}

export interface ForecastPoint {
  date: string;
  projectedBalance: number;
  inflowsOnDate: number;
  outflowsOnDate: number;
  isNegative: boolean;
  events: string[];
}
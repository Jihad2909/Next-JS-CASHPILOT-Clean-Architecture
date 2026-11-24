import { IFinanceRepository } from '@/domain/repositories/IFinanceRepository';

export class FinanceUseCases {
  constructor(private readonly repository: IFinanceRepository) {}

  async recordPartialOrFullPayment(params: {
    invoiceId: string;
    amount: number;
    method: string;
    userId: string;
  }) {
    if (params.amount <= 0) {
      throw new Error('Le montant encaissé doit être supérieur à 0.');
    }
    await this.repository.applyInvoicePayment(params);
  }

  async approveOrRejectExpense(params: {
    expenseId: string;
    decision: 'APPROUVEE' | 'REFUSEE';
    userId: string;
  }) {
    await this.repository.updateExpenseDecision(params);
  }

  async executeExpensePayment(params: { expenseId: string; userId: string }) {
    await this.repository.payApprovedExpense(params);
  }
}
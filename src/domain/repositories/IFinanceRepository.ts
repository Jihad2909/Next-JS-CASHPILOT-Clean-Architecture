import { UserRole } from '../entities/FinanceTypes';

export interface IFinanceRepository {
  getUserRole(userId: string, enterpriseId: string): Promise<UserRole | null>;
  applyInvoicePayment(params: {
    invoiceId: string;
    amount: number;
    method: string;
    userId: string;
  }): Promise<void>;
  updateExpenseDecision(params: {
    expenseId: string;
    decision: 'APPROUVEE' | 'REFUSEE';
    userId: string;
  }): Promise<void>;
  payApprovedExpense(params: {
    expenseId: string;
    userId: string;
  }): Promise<void>;
}
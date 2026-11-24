import { IFinanceRepository } from '@/domain/repositories/IFinanceRepository';
import { UserRole } from '@/domain/entities/FinanceTypes';
import { prisma } from '../database/prisma';
import { Role, InvoiceStatus, ExpenseStatus, MovementType } from '@prisma/client';

export class PrismaFinanceRepository implements IFinanceRepository {
  async getUserRole(userId: string, enterpriseId: string): Promise<UserRole | null> {
    const member = await prisma.enterpriseMember.findUnique({
      where: { userId_enterpriseId: { userId, enterpriseId } },
    });
    return (member?.role as UserRole) ?? null;
  }

  async applyInvoicePayment(params: {
    invoiceId: string;
    amount: number;
    method: string;
    userId: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: params.invoiceId },
        include: { contact: true },
      });

      if (!invoice) throw new Error('Facture introuvable.');
      if (invoice.status === InvoiceStatus.BROUILLON || invoice.status === InvoiceStatus.ANNULEE) {
        throw new Error('Impossible d’encaisser une facture en brouillon ou annulée.');
      }
      if (invoice.status === InvoiceStatus.PAYEE) {
        throw new Error('Cette facture est déjà soldée.');
      }

      const member = await tx.enterpriseMember.findUnique({
        where: { userId_enterpriseId: { userId: params.userId, enterpriseId: invoice.enterpriseId } },
      });
      if (!member || (member.role !== Role.DIRIGEANT && member.role !== Role.GESTIONNAIRE_FINANCIER)) {
        throw new Error('Accès refusé : rôle Dirigeant ou Gestionnaire requis.');
      }

      const total = Number(invoice.totalAmount);
      const alreadyPaid = Number(invoice.paidAmount);
      const remaining = Number((total - alreadyPaid).toFixed(3));

      if (params.amount > remaining) {
        throw new Error(
          `Montant trop élevé : reste à payer = ${remaining.toFixed(3)} DT.`
        );
      }

      const newPaid = Number((alreadyPaid + params.amount).toFixed(3));
      const newStatus = newPaid >= total ? InvoiceStatus.PAYEE : InvoiceStatus.PARTIELLEMENT_PAYEE;

      const payment = await tx.payment.create({
        data: { amount: params.amount, method: params.method, invoiceId: invoice.id },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, status: newStatus },
      });

      await tx.enterprise.update({
        where: { id: invoice.enterpriseId },
        data: { currentBalance: { increment: params.amount } },
      });

      await tx.cashMovement.create({
        data: {
          type: MovementType.ENCAISSEMENT,
          amount: params.amount,
          description: `Encaissement ${invoice.number} (${invoice.contact.name})`,
          referenceId: payment.id,
          enterpriseId: invoice.enterpriseId,
        },
      });
    });
  }

  async updateExpenseDecision(params: {
    expenseId: string;
    decision: 'APPROUVEE' | 'REFUSEE';
    userId: string;
  }): Promise<void> {
    const expense = await prisma.expense.findUnique({ where: { id: params.expenseId } });
    if (!expense) throw new Error('Dépense introuvable.');
    if (expense.status !== ExpenseStatus.EN_ATTENTE) {
      throw new Error('Seule une dépense en attente peut être traitée.');
    }

    const role = await this.getUserRole(params.userId, expense.enterpriseId);
    if (role !== 'DIRIGEANT') {
      throw new Error('Accès refusé : seul le Dirigeant peut approuver ou refuser une dépense.');
    }

    await prisma.expense.update({
      where: { id: expense.id },
      data: {
        status: params.decision === 'APPROUVEE' ? ExpenseStatus.APPROUVEE : ExpenseStatus.REFUSEE,
        approvedById: params.userId,
      },
    });
  }

  async payApprovedExpense(params: { expenseId: string; userId: string }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: params.expenseId } });
      if (!expense) throw new Error('Dépense introuvable.');
      if (expense.status !== ExpenseStatus.APPROUVEE) {
        throw new Error(`Paiement bloqué : statut actuel "${expense.status}".`);
      }

      const member = await tx.enterpriseMember.findUnique({
        where: { userId_enterpriseId: { userId: params.userId, enterpriseId: expense.enterpriseId } },
      });
      if (!member || (member.role !== Role.DIRIGEANT && member.role !== Role.GESTIONNAIRE_FINANCIER)) {
        throw new Error('Accès refusé : permissions insuffisantes.');
      }

      await tx.expense.update({
        where: { id: expense.id },
        data: { status: ExpenseStatus.PAYEE },
      });

      await tx.enterprise.update({
        where: { id: expense.enterpriseId },
        data: { currentBalance: { decrement: expense.amount } },
      });

      await tx.cashMovement.create({
        data: {
          type: MovementType.DECAISSEMENT,
          amount: expense.amount,
          description: `Paiement dépense : ${expense.title}`,
          referenceId: expense.id,
          enterpriseId: expense.enterpriseId,
        },
      });
    });
  }
}
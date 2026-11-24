'use server';

import { PrismaFinanceRepository } from '@/infrastructure/repositories/PrismaFinanceRepository';
import { FinanceUseCases } from '@/application/use-cases/FinanceUseCases';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const repository = new PrismaFinanceRepository();
const useCases = new FinanceUseCases(repository);

const PaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.string().min(1),
  userId: z.string().uuid(),
});

export async function recordInvoicePayment(rawInput: z.infer<typeof PaymentSchema>) {
  const input = PaymentSchema.parse(rawInput);
  await useCases.recordPartialOrFullPayment(input);
  revalidatePath('/');
  revalidatePath('/factures');
  revalidatePath('/simulation');
  return { success: true };
}

export async function reviewExpense(rawInput: {
  expenseId: string;
  decision: 'APPROUVEE' | 'REFUSEE';
  userId: string;
}) {
  await useCases.approveOrRejectExpense(rawInput);
  revalidatePath('/');
  revalidatePath('/depenses');
  revalidatePath('/simulation');
  return { success: true };
}

export async function markExpenseAsPaid(rawInput: { expenseId: string; userId: string }) {
  await useCases.executeExpensePayment(rawInput);
  revalidatePath('/');
  revalidatePath('/depenses');
  revalidatePath('/simulation');
  return { success: true };
}
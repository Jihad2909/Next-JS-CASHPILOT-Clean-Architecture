import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { prisma } from '@/infrastructure/database/prisma';
import { Navbar } from '@/presentation/components/Navbar';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CashPilot — Gestion & Prévision de Trésorerie',
  description: 'Plateforme FinTech de pilotage et simulation de trésorerie',
};

// Composant serveur asynchrone dédié au chargement des membres (exécuté dans Suspense)
async function NavbarLoader() {
  const members = await prisma.enterpriseMember.findMany({ include: { user: true } });
  const users = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    role: m.role,
  }));
  const defaultUserId = users[0]?.id ?? '';

  return <Navbar users={users} activeUserId={defaultUserId} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
          <NavbarLoader />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}
// prisma/seed.ts
import { PrismaClient, Role, InvoiceStatus, ExpenseStatus, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Nettoyage pour pouvoir relancer le seed proprement
  await prisma.cashMovement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.enterpriseMember.deleteMany();
  await prisma.enterprise.deleteMany();
  await prisma.user.deleteMany();

  // 1. Création des 3 profils utilisateurs du sujet
  const dirigeant = await prisma.user.create({
    data: { email: 'dirigeant@tunisdigital.tn', name: 'Sami Ben Ali (Dirigeant)' },
  });
  const gestionnaire = await prisma.user.create({
    data: { email: 'finance@tunisdigital.tn', name: 'Amel Trabelsi (Gestionnaire)' },
  });
  const collaborateur = await prisma.user.create({
    data: { email: 'dev@tunisdigital.tn', name: 'Jihad Mazrani (Collaborateur)' },
  });

  // 2. Création de l'entreprise (Secteur: Agence Digitale) avec 5 000 DT initial
  const enterprise = await prisma.enterprise.create({
    data: {
      name: 'Tunis Digital Studio',
      sector: 'Agence Digitale',
      currency: 'DT',
      initialBalance: 5000.000,
      currentBalance: 6500.000, // 5000 initial + 1500 acompte reçu
      members: {
        create: [
          { userId: dirigeant.id, role: Role.DIRIGEANT },
          { userId: gestionnaire.id, role: Role.GESTIONNAIRE_FINANCIER },
          { userId: collaborateur.id, role: Role.COLLABORATEUR },
        ],
      },
    },
  });

  await prisma.cashMovement.create({
    data: {
      type: MovementType.AJUSTEMENT_INITIAL,
      amount: 5000.000,
      description: 'Solde initial à la création de l’entreprise',
      enterpriseId: enterprise.id,
    },
  });

  // 3. Clients & Fournisseurs
  const clientCarthage = await prisma.contact.create({
    data: {
      name: 'Carthage Hotels Group',
      email: 'compta@carthagehotels.tn',
      phone: '+216 71 000 111',
      type: 'CLIENT',
      enterpriseId: enterprise.id,
    },
  });

  const fournisseurAws = await prisma.contact.create({
    data: {
      name: 'Amazon Web Services (AWS)',
      email: 'billing@aws.com',
      type: 'FOURNISSEUR',
      enterpriseId: enterprise.id,
    },
  });

  // 4. Projets Clients (Personnalisation Agence Digitale)
  const projetRefonte = await prisma.project.create({
    data: {
      name: 'Refonte E-Commerce Carthage Hotels',
      budget: 8000.000,
      enterpriseId: enterprise.id,
    },
  });

  const today = new Date();
  const in10Days = new Date(today);
  in10Days.setDate(today.getDate() + 10);
  const in15Days = new Date(today);
  in15Days.setDate(today.getDate() + 15);

  // 5. Facture partiellement payée (4 500 DT total, 1 500 DT payés, 3 000 DT restants attendus)
  const invoice1 = await prisma.invoice.create({
    data: {
      number: 'FAC-2026-001',
      dueDate: in10Days,
      totalAmount: 4500.000,
      paidAmount: 1500.000,
      status: InvoiceStatus.PARTIELLEMENT_PAYEE,
      enterpriseId: enterprise.id,
      contactId: clientCarthage.id,
      projectId: projetRefonte.id,
      payments: {
        create: [{ amount: 1500.000, method: 'VIREMENT' }],
      },
    },
  });

  await prisma.cashMovement.create({
    data: {
      type: MovementType.ENCAISSEMENT,
      amount: 1500.000,
      description: `Encaissement partiel ${invoice1.number} (${clientCarthage.name})`,
      referenceId: invoice1.id,
      enterpriseId: enterprise.id,
    },
  });

  // 6. Dépenses (1 approuvée de 6 000 DT + 1 en attente à valider en soutenance)
  await prisma.expense.create({
    data: {
      title: 'Prestataires Design & Infrastructure Cloud Q4',
      category: 'Sous-traitance & Cloud',
      amount: 6000.000,
      expectedDate: in15Days,
      status: ExpenseStatus.APPROUVEE,
      enterpriseId: enterprise.id,
      contactId: fournisseurAws.id,
      projectId: projetRefonte.id,
      submittedById: gestionnaire.id,
      approvedById: dirigeant.id,
    },
  });

  await prisma.expense.create({
    data: {
      title: 'Licences Figma & Serveurs Staging',
      category: 'Outils SaaS',
      amount: 850.000,
      expectedDate: in10Days,
      status: ExpenseStatus.EN_ATTENTE,
      enterpriseId: enterprise.id,
      projectId: projetRefonte.id,
      submittedById: collaborateur.id,
    },
  });

  console.log('✅ Base de données CashPilot initialisée avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
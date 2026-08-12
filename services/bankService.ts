"use server";

import prisma from "@/lib/prisma";
import { DEFAULT_EXPENSE_CATEGORIES, RESERVED_SLUGS } from "@/utils/constants";
import { Prisma } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { serialize } from "@/lib/serialize";

export async function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getBankBySlug(slug: string) {
  console.log("getBankBySlug called with:", slug);
  if (!slug) {
    console.error("getBankBySlug was called with an undefined or empty slug!");
    return null;
  }
  const bank = await prisma.bank.findFirst({
    where: { slug, isActive: true },
  });
  return bank;
}

export async function getBankWithRoleBySlug(slug: string) {
  const bank = await getBankBySlug(slug);
  if (!bank) return null;
  
  let userRole = null;
  try {
    const { userId } = await auth();
    if (userId) {
      const member = await prisma.bankMember.findFirst({
        where: { bankId: bank.id, userId },
      });
      if (member) userRole = member.role;
    }
  } catch (e) {
    // Auth might fail on public routes, ignore
  }
  
  return serialize({ ...bank, userRole });
}

export async function getRootBank() {
  const bank = await prisma.bank.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return bank;
}

export async function createBank(bankData: { name: string; currency: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Ensure the user exists in our DB (in local dev, Clerk webhook may not fire)
  const clerkUser = await currentUser();
  if (clerkUser) {
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      "";
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: primaryEmail,
        fullName:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        avatarUrl: clerkUser.imageUrl,
      },
      create: {
        id: userId,
        email: primaryEmail,
        fullName:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        avatarUrl: clerkUser.imageUrl,
      },
    });
  }

  const slug = await generateSlug(bankData.name);
  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error(
      `The name "${bankData.name}" generates a reserved URL. Please choose a different name.`
    );
  }

  // Check if slug exists
  const existing = await prisma.bank.findFirst({ where: { slug } });
  if (existing) {
    throw new Error(`A bank with this name/URL already exists.`);
  }

  // NOTE: Prisma Accelerate does not support $transaction — run sequentially.

  // 1. Create Bank
  const bank = await prisma.bank.create({
    data: {
      name: bankData.name,
      slug,
      currency: bankData.currency || "BDT",
      ownerId: userId,
    },
  });

  // 2. Create BankMember (owner)
  await prisma.bankMember.create({
    data: {
      bankId: bank.id,
      userId: userId,
      role: "owner",
    },
  });

  // 3. Create HandCashAccount
  await prisma.handCashAccount.create({
    data: {
      bankId: bank.id,
      balance: 0,
    },
  });

  // 4. Seed ExpenseCategories
  const categories = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
    bankId: bank.id,
    name,
  }));
  await prisma.expenseCategory.createMany({
    data: categories,
  });

  return bank;
}


export async function getBankByOwner() {
  const { userId } = await auth();
  if (!userId) return null;

  const bank = await prisma.bank.findFirst({
    where: { ownerId: userId },
  });
  return serialize(bank);
}

export async function getBankByMember() {
  const { userId } = await auth();
  if (!userId) return null;

  const member = await prisma.bankMember.findFirst({
    where: { userId },
    include: { bank: true },
  });

  if (!member) return null;
  return serialize({ ...member.bank, userRole: member.role });
}

export async function updateBank(bankId: string, updates: Prisma.BankUpdateInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const bank = await prisma.bank.update({
    where: { id: bankId },
    data: updates,
  });
  return serialize(bank);
}

export async function getExpenseCategories(bankId: string) {
  const categories = await prisma.expenseCategory.findMany({
    where: { bankId },
    orderBy: { name: "asc" },
  });
  return serialize(categories);
}

export async function addExpenseCategory(bankId: string, name: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const category = await prisma.expenseCategory.create({
    data: {
      bankId,
      name,
    },
  });
  return category;
}

export async function deleteExpenseCategory(categoryId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.expenseCategory.delete({
    where: { id: categoryId },
  });
}

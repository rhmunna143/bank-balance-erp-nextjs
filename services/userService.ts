"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return await prisma.user.findUnique({ where: { id: userId } });
}

export async function getMembers(bankId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify caller has access
  const caller = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId, userId } }
  });
  if (!caller) throw new Error("Unauthorized for this bank");

  const members = await prisma.bankMember.findMany({
    where: { bankId },
    include: {
      user: true
    },
    orderBy: { joinedAt: 'asc' }
  });
  
  return members.map((m: any) => ({
    ...m,
    profiles: m.user
  }));
}

export async function inviteUser(bankId: string, email: string, role: string = 'operator') {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify caller is admin or owner
  const caller = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId, userId } }
  });
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw new Error("Only admins or owners can invite users.");
  }

  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `temp_${Date.now()}`,
        email,
        fullName: email.split('@')[0]
      }
    });
  }

  const member = await prisma.bankMember.create({
    data: {
      bankId,
      userId: user.id,
      role
    }
  });

  return member;
}

export async function removeMember(memberId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const targetMember = await prisma.bankMember.findUnique({
    where: { id: memberId }
  });
  if (!targetMember) throw new Error("Member not found");

  const caller = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId: targetMember.bankId, userId } }
  });
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw new Error("Only admins or owners can remove users.");
  }

  // Prevent removing the owner
  if (targetMember.role === 'owner') {
    throw new Error("Cannot remove the bank owner.");
  }

  await prisma.bankMember.delete({
    where: { id: memberId }
  });
}

export async function updateRole(memberId: string, role: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const targetMember = await prisma.bankMember.findUnique({
    where: { id: memberId }
  });
  if (!targetMember) throw new Error("Member not found");

  const caller = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId: targetMember.bankId, userId } }
  });
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw new Error("Only admins or owners can change roles.");
  }

  if (targetMember.role === 'owner' && role !== 'owner') {
    throw new Error("Cannot downgrade the bank owner.");
  }

  const data = await prisma.bankMember.update({
    where: { id: memberId },
    data: { role }
  });
  return data;
}

export async function resetMemberPassword(targetUserId: string, newPassword: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  
  throw new Error("Password reset is managed by Clerk now.");
}

// ─── JOIN REQUESTS ─────────────────────────────────────────────────────────

export async function createJoinRequest(bankSlug: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const bank = await prisma.bank.findUnique({
    where: { slug: bankSlug }
  });
  if (!bank) throw new Error("Bank not found.");

  // Check if already a member
  const existingMember = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId: bank.id, userId } }
  });
  if (existingMember) throw new Error("You are already a member of this bank.");

  // Upsert the request (in case it was previously rejected and they are trying again)
  const req = await prisma.bankJoinRequest.upsert({
    where: { bankId_userId: { bankId: bank.id, userId } },
    update: { status: 'pending' },
    create: { bankId: bank.id, userId, status: 'pending' }
  });
  return req;
}

export async function getUserRequests() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.bankJoinRequest.findMany({
    where: { userId },
    include: { bank: true },
    orderBy: { createdAt: 'desc' }
  });
  return requests;
}

export async function getPendingRequests(bankId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const caller = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId, userId } }
  });
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw new Error("Unauthorized.");
  }

  const requests = await prisma.bankJoinRequest.findMany({
    where: { bankId, status: 'pending' },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  });
  return requests;
}

export async function approveJoinRequest(requestId: string, role: string = 'operator') {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const req = await prisma.bankJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Request not found.");

  const caller = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId: req.bankId, userId } }
  });
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw new Error("Unauthorized.");
  }

  // Create member and update request
  const member = await prisma.bankMember.create({
    data: {
      bankId: req.bankId,
      userId: req.userId,
      role
    }
  });

  await prisma.bankJoinRequest.update({
    where: { id: requestId },
    data: { status: 'approved' }
  });

  return member;
}

export async function rejectJoinRequest(requestId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const req = await prisma.bankJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Request not found.");

  const caller = await prisma.bankMember.findUnique({
    where: { bankId_userId: { bankId: req.bankId, userId } }
  });
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw new Error("Unauthorized.");
  }

  await prisma.bankJoinRequest.update({
    where: { id: requestId },
    data: { status: 'rejected' }
  });
}

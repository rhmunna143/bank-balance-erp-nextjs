"use server";

import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function getMembers(bankId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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

  await prisma.bankMember.delete({
    where: { id: memberId }
  });
}

export async function updateRole(memberId: string, role: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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

import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export default async function GlobalDashboardRedirect() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) {
    redirect('/sign-in');
  }

  const email = user.emailAddresses[0]?.emailAddress;
  const isSuperAdmin = email === process.env.SUPER_ADMIN_EMAIL;

  // Upsert user to ensure they exist in our DB (especially for local dev without webhooks)
  await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: email,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      avatarUrl: user.imageUrl,
      ...(isSuperAdmin && { isSuperAdmin: true }), // Only grant, don't revoke automatically
    },
    create: {
      id: userId,
      email: email,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      avatarUrl: user.imageUrl,
      isSuperAdmin: isSuperAdmin,
    }
  });

  // 1. Fetch the user's memberships
  const member = await prisma.bankMember.findFirst({
    where: { userId },
    include: { bank: true },
  });

  // 2. If they belong to a bank, send them to their bank's dashboard
  if (member && member.bank) {
    redirect(`/${member.bank.slug}/dashboard`);
  }

  // 3. Otherwise, send them to onboarding
  redirect('/onboarding');
}

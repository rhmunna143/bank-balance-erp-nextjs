import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  const client = connectionString 
    ? new PrismaClient({ accelerateUrl: connectionString })
    : new PrismaClient();
    
  return client.$extends(withAccelerate());
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

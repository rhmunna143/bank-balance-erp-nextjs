import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

async function test() {
  console.log("Testing with accelerateUrl...");
  try {
    const prisma = new PrismaClient({
      accelerateUrl: process.env.DATABASE_URL,
    });
    const count = await prisma.bank.count();
    console.log("Bank count:", count);
  } catch(e) {
    console.error("accelerateUrl error:", e);
  }
}

test();

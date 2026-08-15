import prisma from './config/database';

async function test() {
  try {
    console.log("Querying database for wordpress inquiries...");
    const data = await prisma.wordPressInquiry.findMany();
    console.log("SUCCESS! Row count:", data.length);
  } catch (err: any) {
    console.error("FAILED to query database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();

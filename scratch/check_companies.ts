import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Database URL in process.env:', process.env.DATABASE_URL);
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      email: true
    }
  });
  console.log('Total companies in database:', companies.length);
  console.log('Companies:', JSON.stringify(companies, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Database URL in process.env:', process.env.DATABASE_URL);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: {
        select: {
          name: true
        }
      },
      company: {
        select: {
          name: true
        }
      }
    }
  });
  
  const managers = users.filter(u => u.role?.name === 'Property Manager');
  
  console.log('Total users in database:', users.length);
  console.log('All Users:', JSON.stringify(users, null, 2));
  console.log('\n--- PROPERTY MANAGERS ---');
  console.log('Total Property Managers:', managers.length);
  console.log('Managers:', JSON.stringify(managers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

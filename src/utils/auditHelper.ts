import prisma from '../config/database';

export async function getValidUserId(userId?: string, tx?: any): Promise<string | null> {
  if (!userId) return null;
  const client = tx || prisma;
  try {
    const user = await client.user.findUnique({
      where: { id: userId },
    });
    return user ? user.id : null;
  } catch {
    return null;
  }
}

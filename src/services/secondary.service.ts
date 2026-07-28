import prisma from '../config/database';

export class SecondaryService {
  // Announcements
  async getAnnouncements(companyId?: string) {
    return prisma.announcement.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(data: { title: string; content: string; category?: string; isPinned?: boolean }, companyId?: string) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category || 'General',
        isPinned: data.isPinned || false,
        companyId,
      },
    });
  }

  // Insurance Policies
  async getInsurancePolicies(companyId?: string) {
    return prisma.insurancePolicy.findMany({
      where: companyId ? { companyId } : {},
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInsurancePolicy(data: { tenantId: string; policyNumber: string; provider: string; coverageAmount: number; startDate: Date; endDate: Date }, companyId?: string) {
    return prisma.insurancePolicy.create({
      data: {
        tenantId: data.tenantId,
        policyNumber: data.policyNumber,
        provider: data.provider,
        coverageAmount: data.coverageAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        companyId,
      },
    });
  }

  // Promotions
  async getPromotions(companyId?: string) {
    return prisma.promotion.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPromotion(data: { code: string; discount: string; duration: string; maxUses?: number }, companyId?: string) {
    return prisma.promotion.create({
      data: {
        code: data.code,
        discount: data.discount,
        duration: data.duration,
        maxUses: data.maxUses || 100,
        companyId,
      },
    });
  }

  // Notifications
  async getNotifications(companyId?: string) {
    return prisma.notification.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(id: string, companyId?: string) {
    if (companyId) {
      const check = await prisma.notification.findFirst({ where: { id, companyId } });
      if (!check) throw new Error('Notification not found.');
    }
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  // Documents
  async getDocuments(companyId?: string) {
    return prisma.document.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(data: { name: string; category?: string; fileUrl: string; fileSize?: string; uploadedBy?: string }, companyId?: string) {
    return prisma.document.create({
      data: {
        name: data.name,
        category: data.category || 'General',
        fileUrl: data.fileUrl,
        fileSize: data.fileSize || '1.5 MB',
        uploadedBy: data.uploadedBy || 'Property Manager',
        companyId,
      },
    });
  }

  // AI Assistant Chat Response based on live DB metrics (Scoped by companyId)
  async processAiChat(prompt: string, companyId?: string) {
    const propertyCount = await prisma.property.count({
      where: companyId ? { companyId } : {},
    });
    const unitCount = await prisma.unit.count({
      where: companyId ? { property: { companyId } } : {},
    });
    const occupiedUnits = await prisma.unit.count({
      where: {
        status: 'Occupied',
        ...(companyId ? { property: { companyId } } : {}),
      },
    });
    const tenantCount = await prisma.tenant.count({
      where: companyId ? { companyId } : {},
    });
    const occupancyRate = unitCount > 0 ? Math.round((occupiedUnits / unitCount) * 100) : 0;

    const queryLower = prompt.toLowerCase();
    let responseText = `I am your DoorLoop ERP AI Assistant. Currently, your portfolio consists of ${propertyCount} properties, ${unitCount} total units (${occupancyRate}% occupancy), and ${tenantCount} active tenants. How can I further assist with your property management operations?`;

    if (queryLower.includes('occupancy') || queryLower.includes('units')) {
      responseText = `Portfolio Occupancy Analysis: You have ${unitCount} total units across ${propertyCount} properties. Current occupied units: ${occupiedUnits} (${occupancyRate}% occupancy rate).`;
    } else if (queryLower.includes('tenant') || queryLower.includes('resident')) {
      responseText = `Tenant Overview: There are currently ${tenantCount} active tenants registered in your company.`;
    } else if (queryLower.includes('revenue') || queryLower.includes('financial') || queryLower.includes('expense')) {
      responseText = `Financial Summary: All transactions, rent payments, and chart of accounts are recorded live in your double-entry accounting ledger.`;
    }

    await prisma.aiChatLog.create({
      data: {
        prompt,
        response: responseText,
        companyId,
      },
    });

    return { prompt, response: responseText };
  }
}

export const secondaryService = new SecondaryService();

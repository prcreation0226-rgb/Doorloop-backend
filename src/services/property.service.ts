import prisma from '../config/database';
import { AppError } from '../utils/appError';

export class PropertyService {
  async getAllProperties(companyId?: string) {
    return prisma.property.findMany({
      where: companyId ? { companyId } : {},
      include: {
        owner: true,
        buildings: true,
        units: true,
      },
    });
  }

  async getPropertyById(id: string, companyId?: string) {
    const prop = await prisma.property.findFirst({
      where: companyId ? { id, companyId } : { id },
      include: {
        owner: true,
        buildings: true,
        units: true,
      },
    });

    if (!prop) throw new AppError('Property not found.', 404, 'NOT_FOUND');
    return prop;
  }

  async createProperty(data: any) {
    let ownerId = data.ownerId;
    let ownerExists = false;

    if (ownerId) {
      try {
        const owner = await prisma.owner.findUnique({
          where: { id: ownerId },
        });
        if (owner) {
          ownerExists = true;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!ownerExists) {
      const firstOwner = await prisma.owner.findFirst({
        where: data.companyId ? { companyId: data.companyId } : {},
      });
      if (firstOwner) {
        ownerId = firstOwner.id;
      } else {
        const defaultOwner = await prisma.owner.create({
          data: {
            firstName: 'Default',
            lastName: 'Owner',
            email: `default.owner.${Date.now()}@example.com`,
            phone: '555-0100',
            companyId: data.companyId,
          }
        });
        ownerId = defaultOwner.id;
      }
    }

    let typeVal = (data.type || 'Apartment').replace(/\s+/g, '');
    const validTypes = ['Apartment', 'Commercial', 'SingleFamily', 'MultiFamily', 'HOA'];
    if (!validTypes.includes(typeVal)) {
      typeVal = 'Apartment';
    }
    return prisma.property.create({
      data: {
        name: data.name,
        type: typeVal as any,
        status: data.status || 'Active',
        ownerId: ownerId,
        ownershipPercentage: data.ownershipPercentage || 100,
        managementCompany: data.managementCompany || 'Apex Property Management',
        address: data.address || 'Austin, TX',
        streetAddress: data.streetAddress || data.address || '100 Main St',
        city: data.city || 'Austin',
        state: data.state || 'TX',
        zip: data.zip || '78701',
        yearBuilt: data.yearBuilt || 2020,
        squareFootage: data.squareFootage || 10000,
        purchasePrice: data.purchasePrice || 1000000,
        currentValue: data.currentValue || 1200000,
        companyId: data.companyId,
      },
    });
  }

  async deleteProperty(id: string, companyId?: string) {
    if (companyId) {
      const prop = await prisma.property.findFirst({
        where: { id, companyId },
      });
      if (!prop) throw new AppError('Property not found.', 404, 'NOT_FOUND');
    }
    return prisma.property.delete({
      where: { id },
    });
  }
}

export const propertyService = new PropertyService();

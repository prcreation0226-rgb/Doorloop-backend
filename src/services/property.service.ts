import prisma from '../config/database';
import { AppError } from '../utils/appError';
import cloudinary from '../config/cloudinary';
import { getManagerCompanyId } from '../utils/companyHelper';

export class PropertyService {
  async getAllProperties(companyId?: string, user?: any) {
    let whereClause: any = companyId ? { companyId } : {};

    if ((user?.roleName === 'Owner' || user?.role === 'Owner') && user?.email) {
      const owner = await prisma.owner.findFirst({
        where: { email: user.email },
      });
      if (owner) {
        whereClause.ownerId = owner.id;
      } else {
        return [];
      }
    }

    return prisma.property.findMany({
      where: whereClause,
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

  async createProperty(data: any, file?: any) {
    const companyId = await getManagerCompanyId(undefined, data.companyId);
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
        where: companyId ? { companyId } : {},
      });
      if (firstOwner) {
        ownerId = firstOwner.id;
      } else {
        const defaultOwner = await prisma.owner.create({
          data: {
            name: 'Default Owner',
            email: `default.owner.${Date.now()}@example.com`,
            phone: '555-0100',
            companyId,
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

    // Cloudinary upload
    let imageUrl = data.imageUrl || null;
    if (file) {
      try {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'properties' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result?.secure_url || '');
            }
          );
          uploadStream.end(file.buffer);
        });
      } catch (err) {
        console.error('Cloudinary image upload failed:', err);
      }
    }

    return prisma.property.create({
      data: {
        name: data.name,
        type: typeVal as any,
        status: data.status || 'Active',
        ownerId: ownerId,
        ownershipPercentage: Number(data.ownershipPercentage) || 100,
        managementCompany: data.managementCompany || 'Apex Property Management',
        address: data.address || 'Austin, TX',
        streetAddress: data.streetAddress || data.address || '100 Main St',
        city: data.city || 'Austin',
        state: data.state || 'TX',
        zip: data.zip || '78701',
        yearBuilt: Number(data.yearBuilt) || 2020,
        squareFootage: Number(data.squareFootage) || 10000,
        purchasePrice: Number(data.purchasePrice) || 1000000,
        currentValue: Number(data.currentValue) || 1200000,
        imageUrl: imageUrl,
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

  async updateProperty(id: string, data: any, file?: any, companyId?: string) {
    const prop = await prisma.property.findFirst({
      where: companyId ? { id, companyId } : { id },
    });
    if (!prop) throw new AppError('Property not found.', 404, 'NOT_FOUND');

    let ownerId = data.ownerId;
    if (ownerId) {
      const owner = await prisma.owner.findUnique({
        where: { id: ownerId },
      });
      if (!owner) {
        ownerId = prop.ownerId;
      }
    } else {
      ownerId = prop.ownerId;
    }

    let typeVal = data.type;
    if (typeVal) {
      typeVal = typeVal.replace(/\s+/g, '');
      const validTypes = ['Apartment', 'Commercial', 'SingleFamily', 'MultiFamily', 'HOA'];
      if (!validTypes.includes(typeVal)) {
        typeVal = prop.type;
      }
    } else {
      typeVal = prop.type;
    }

    // Cloudinary upload
    let imageUrl = data.imageUrl !== undefined ? data.imageUrl : prop.imageUrl;
    if (file) {
      try {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'properties' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result?.secure_url || '');
            }
          );
          uploadStream.end(file.buffer);
        });
      } catch (err) {
        console.error('Cloudinary image upload failed:', err);
      }
    }

    return prisma.property.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : prop.name,
        type: typeVal as any,
        status: data.status !== undefined ? data.status : prop.status,
        ownerId: ownerId,
        ownershipPercentage: data.ownershipPercentage !== undefined ? Number(data.ownershipPercentage) : prop.ownershipPercentage,
        managementCompany: data.managementCompany !== undefined ? data.managementCompany : prop.managementCompany,
        address: data.address !== undefined ? data.address : prop.address,
        streetAddress: data.streetAddress !== undefined ? data.streetAddress : prop.streetAddress,
        city: data.city !== undefined ? data.city : prop.city,
        state: data.state !== undefined ? data.state : prop.state,
        zip: data.zip !== undefined ? data.zip : prop.zip,
        yearBuilt: data.yearBuilt !== undefined ? Number(data.yearBuilt) : prop.yearBuilt,
        squareFootage: data.squareFootage !== undefined ? Number(data.squareFootage) : prop.squareFootage,
        purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : prop.purchasePrice,
        currentValue: data.currentValue !== undefined ? Number(data.currentValue) : prop.currentValue,
        imageUrl: imageUrl,
      },
    });
  }
}

export const propertyService = new PropertyService();

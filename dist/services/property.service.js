"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyService = exports.PropertyService = void 0;
const database_1 = __importDefault(require("../config/database"));
const appError_1 = require("../utils/appError");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
class PropertyService {
    async getAllProperties(companyId) {
        return database_1.default.property.findMany({
            where: companyId ? { companyId } : {},
            include: {
                owner: true,
                buildings: true,
                units: true,
            },
        });
    }
    async getPropertyById(id, companyId) {
        const prop = await database_1.default.property.findFirst({
            where: companyId ? { id, companyId } : { id },
            include: {
                owner: true,
                buildings: true,
                units: true,
            },
        });
        if (!prop)
            throw new appError_1.AppError('Property not found.', 404, 'NOT_FOUND');
        return prop;
    }
    async createProperty(data, file) {
        let ownerId = data.ownerId;
        let ownerExists = false;
        if (ownerId) {
            try {
                const owner = await database_1.default.owner.findUnique({
                    where: { id: ownerId },
                });
                if (owner) {
                    ownerExists = true;
                }
            }
            catch (e) {
                // ignore
            }
        }
        if (!ownerExists) {
            const firstOwner = await database_1.default.owner.findFirst({
                where: data.companyId ? { companyId: data.companyId } : {},
            });
            if (firstOwner) {
                ownerId = firstOwner.id;
            }
            else {
                const defaultOwner = await database_1.default.owner.create({
                    data: {
                        name: 'Default Owner',
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
        // Cloudinary upload
        let imageUrl = data.imageUrl || null;
        if (file) {
            try {
                imageUrl = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary_1.default.uploader.upload_stream({ folder: 'properties' }, (error, result) => {
                        if (error)
                            return reject(error);
                        resolve(result?.secure_url || '');
                    });
                    uploadStream.end(file.buffer);
                });
            }
            catch (err) {
                console.error('Cloudinary image upload failed:', err);
            }
        }
        return database_1.default.property.create({
            data: {
                name: data.name,
                type: typeVal,
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
    async deleteProperty(id, companyId) {
        if (companyId) {
            const prop = await database_1.default.property.findFirst({
                where: { id, companyId },
            });
            if (!prop)
                throw new appError_1.AppError('Property not found.', 404, 'NOT_FOUND');
        }
        return database_1.default.property.delete({
            where: { id },
        });
    }
}
exports.PropertyService = PropertyService;
exports.propertyService = new PropertyService();

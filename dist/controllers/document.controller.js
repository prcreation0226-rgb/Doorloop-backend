"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentController = exports.DocumentController = void 0;
const database_1 = __importDefault(require("../config/database"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const apiResponse_1 = require("../utils/apiResponse");
class DocumentController {
    // Helper to format bytes to human readable format
    formatBytes(bytes, decimals = 1) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    // Upload Owner Document
    async uploadOwnerDocument(req, res, next) {
        try {
            const { name, category, ownerId, propertyId } = req.body;
            const companyId = req.user?.companyId;
            const file = req.file;
            if (!file) {
                throw new Error('File is required for upload');
            }
            // Cloudinary Upload
            let fileUrl = '';
            try {
                fileUrl = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary_1.default.uploader.upload_stream({ folder: 'owner-documents' }, (error, result) => {
                        if (error)
                            return reject(error);
                        resolve(result?.secure_url || '');
                    });
                    uploadStream.end(file.buffer);
                });
            }
            catch (err) {
                console.error('Cloudinary owner document upload failed:', err);
                throw new Error('Cloudinary upload failed');
            }
            const fileSizeStr = this.formatBytes(file.size);
            // Save to database
            const doc = await database_1.default.ownerDocument.create({
                data: {
                    name: name || file.originalname,
                    category: category || 'Statements',
                    size: fileSizeStr,
                    fileUrl,
                    ownerId: ownerId || null,
                    propertyId: propertyId || null,
                    companyId: companyId || null,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: doc, message: 'Owner document uploaded successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
    // Upload Tenant Document
    async uploadTenantDocument(req, res, next) {
        try {
            const { name, category, tenantId, propertyId, buildingId, unitId } = req.body;
            const companyId = req.user?.companyId;
            const file = req.file;
            if (!file) {
                throw new Error('File is required for upload');
            }
            // Cloudinary Upload
            let fileUrl = '';
            try {
                fileUrl = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary_1.default.uploader.upload_stream({ folder: 'tenant-documents' }, (error, result) => {
                        if (error)
                            return reject(error);
                        resolve(result?.secure_url || '');
                    });
                    uploadStream.end(file.buffer);
                });
            }
            catch (err) {
                console.error('Cloudinary tenant document upload failed:', err);
                throw new Error('Cloudinary upload failed');
            }
            const fileSizeStr = this.formatBytes(file.size);
            // Save to database
            const doc = await database_1.default.tenantDocument.create({
                data: {
                    name: name || file.originalname,
                    category: category || 'Leasing',
                    size: fileSizeStr,
                    fileUrl,
                    tenantId: tenantId || null,
                    propertyId: propertyId || null,
                    buildingId: buildingId || null,
                    unitId: unitId || null,
                    companyId: companyId || null,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: doc, message: 'Tenant document uploaded successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
    // Get Owner Documents
    async getOwnerDocuments(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const docs = await database_1.default.ownerDocument.findMany({
                where: companyId ? { companyId } : {},
                orderBy: { uploadedAt: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: docs });
        }
        catch (error) {
            next(error);
        }
    }
    // Get Tenant Documents
    async getTenantDocuments(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const docs = await database_1.default.tenantDocument.findMany({
                where: companyId ? { companyId } : {},
                orderBy: { uploadedAt: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: docs });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DocumentController = DocumentController;
exports.documentController = new DocumentController();

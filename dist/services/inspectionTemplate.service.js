"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionTemplateService = exports.InspectionTemplateService = void 0;
const database_1 = __importDefault(require("../config/database"));
class InspectionTemplateService {
    async getAllTemplates(companyId) {
        return database_1.default.inspectionTemplate.findMany({
            where: companyId ? { companyId } : {},
            include: {
                rooms: {
                    include: {
                        items: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTemplateById(id, companyId) {
        return database_1.default.inspectionTemplate.findFirst({
            where: {
                id,
                ...(companyId ? { companyId } : {}),
            },
            include: {
                rooms: {
                    include: {
                        items: {
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
    }
    async createTemplate(data) {
        return database_1.default.$transaction(async (tx) => {
            const template = await tx.inspectionTemplate.create({
                data: {
                    name: data.name,
                    type: data.type || 'MOVE_IN',
                    description: data.description,
                    active: data.active !== undefined ? data.active : true,
                    createdBy: data.createdBy || 'System',
                    companyId: data.companyId,
                },
            });
            if (data.rooms && Array.isArray(data.rooms)) {
                for (let rIndex = 0; rIndex < data.rooms.length; rIndex++) {
                    const roomData = data.rooms[rIndex];
                    const room = await tx.inspectionTemplateRoom.create({
                        data: {
                            templateId: template.id,
                            name: roomData.name,
                            sortOrder: roomData.sortOrder !== undefined ? roomData.sortOrder : rIndex,
                        },
                    });
                    if (roomData.items && Array.isArray(roomData.items)) {
                        for (let iIndex = 0; iIndex < roomData.items.length; iIndex++) {
                            const itemData = roomData.items[iIndex];
                            await tx.inspectionTemplateItem.create({
                                data: {
                                    roomId: room.id,
                                    label: itemData.label,
                                    required: itemData.required !== undefined ? itemData.required : false,
                                    sortOrder: itemData.sortOrder !== undefined ? itemData.sortOrder : iIndex,
                                },
                            });
                        }
                    }
                }
            }
            await tx.auditLog.create({
                data: {
                    action: 'Inspection Template Created',
                    module: 'Leasing',
                    object: `Template ${template.id}`,
                    ip: '127.0.0.1',
                    status: 'Success',
                },
            });
            return template;
        });
    }
    async updateTemplate(id, data, companyId) {
        const templateExists = await database_1.default.inspectionTemplate.findFirst({
            where: { id, ...(companyId ? { companyId } : {}) },
        });
        if (!templateExists)
            throw new Error('Template not found');
        return database_1.default.$transaction(async (tx) => {
            const template = await tx.inspectionTemplate.update({
                where: { id },
                data: {
                    name: data.name,
                    type: data.type,
                    description: data.description,
                    active: data.active !== undefined ? data.active : undefined,
                },
            });
            // Simple sync logic: delete old rooms/items and recreate if rooms are passed in body
            if (data.rooms && Array.isArray(data.rooms)) {
                // Delete items belonging to rooms in this template
                const existingRooms = await tx.inspectionTemplateRoom.findMany({
                    where: { templateId: id },
                    select: { id: true },
                });
                const roomIds = existingRooms.map((r) => r.id);
                await tx.inspectionTemplateItem.deleteMany({
                    where: { roomId: { in: roomIds } },
                });
                await tx.inspectionTemplateRoom.deleteMany({
                    where: { templateId: id },
                });
                // Recreate
                for (let rIndex = 0; rIndex < data.rooms.length; rIndex++) {
                    const roomData = data.rooms[rIndex];
                    const room = await tx.inspectionTemplateRoom.create({
                        data: {
                            templateId: template.id,
                            name: roomData.name,
                            sortOrder: roomData.sortOrder !== undefined ? roomData.sortOrder : rIndex,
                        },
                    });
                    if (roomData.items && Array.isArray(roomData.items)) {
                        for (let iIndex = 0; iIndex < roomData.items.length; iIndex++) {
                            const itemData = roomData.items[iIndex];
                            await tx.inspectionTemplateItem.create({
                                data: {
                                    roomId: room.id,
                                    label: itemData.label,
                                    required: itemData.required !== undefined ? itemData.required : false,
                                    sortOrder: itemData.sortOrder !== undefined ? itemData.sortOrder : iIndex,
                                },
                            });
                        }
                    }
                }
            }
            await tx.auditLog.create({
                data: {
                    action: 'Inspection Template Updated',
                    module: 'Leasing',
                    object: `Template ${id}`,
                    ip: '127.0.0.1',
                    status: 'Success',
                },
            });
            return template;
        });
    }
    async duplicateTemplate(id, companyId) {
        const original = await database_1.default.inspectionTemplate.findFirst({
            where: { id, ...(companyId ? { companyId } : {}) },
            include: {
                rooms: {
                    include: {
                        items: true,
                    },
                },
            },
        });
        if (!original)
            throw new Error('Template not found');
        return this.createTemplate({
            name: `${original.name} (Copy)`,
            type: original.type,
            description: original.description,
            active: original.active,
            createdBy: original.createdBy,
            companyId: original.companyId,
            rooms: original.rooms.map((room) => ({
                name: room.name,
                sortOrder: room.sortOrder,
                items: room.items.map((item) => ({
                    label: item.label,
                    required: item.required,
                    sortOrder: item.sortOrder,
                })),
            })),
        });
    }
    async duplicateRoom(roomId, companyId) {
        const originalRoom = await database_1.default.inspectionTemplateRoom.findFirst({
            where: { id: roomId },
            include: {
                items: true,
                template: true,
            },
        });
        if (!originalRoom)
            throw new Error('Room not found');
        if (companyId && originalRoom.template.companyId !== companyId)
            throw new Error('Unauthorized');
        return database_1.default.$transaction(async (tx) => {
            const room = await tx.inspectionTemplateRoom.create({
                data: {
                    templateId: originalRoom.templateId,
                    name: `${originalRoom.name} (Copy)`,
                    sortOrder: originalRoom.sortOrder + 1,
                },
            });
            for (let i = 0; i < originalRoom.items.length; i++) {
                const item = originalRoom.items[i];
                await tx.inspectionTemplateItem.create({
                    data: {
                        roomId: room.id,
                        label: item.label,
                        required: item.required,
                        sortOrder: item.sortOrder,
                    },
                });
            }
            return room;
        });
    }
}
exports.InspectionTemplateService = InspectionTemplateService;
exports.inspectionTemplateService = new InspectionTemplateService();

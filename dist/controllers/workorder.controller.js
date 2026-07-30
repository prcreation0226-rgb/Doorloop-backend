"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workOrderController = exports.WorkOrderController = void 0;
const database_js_1 = __importDefault(require("../config/database.js"));
const apiResponse_js_1 = require("../utils/apiResponse.js");
class WorkOrderController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            // 1. Fetch WorkOrders
            const workOrders = await database_js_1.default.workOrder.findMany({
                where: companyId ? { companyId } : {},
                include: { property: true, vendor: true },
                orderBy: { createdAt: 'desc' },
            });
            // 2. Fetch ServiceRequests
            const serviceRequests = await database_js_1.default.serviceRequest.findMany({
                where: companyId ? { companyId } : {},
                orderBy: { createdAt: 'desc' },
            });
            const formattedWorkOrders = workOrders.map((wo, index) => ({
                id: wo.id,
                workOrderNumber: `WO-${1001 + index}`,
                propertyId: wo.propertyId,
                propertyName: wo.property?.name || 'Property',
                unitNumber: 'Unit 101',
                vendorId: wo.vendorId || '',
                vendorName: wo.vendor?.companyName || 'Unassigned',
                assignedTechnician: wo.vendor?.contactName || 'Unassigned',
                scheduledDate: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                priority: wo.priority || 'Normal',
                status: wo.status === 'Open' || wo.status === 'Submitted' ? 'Open' : wo.status === 'InProgress' || wo.status === 'In Progress' ? 'In Progress' : wo.status === 'Completed' ? 'Completed' : wo.status === 'Cancelled' ? 'Cancelled' : wo.status || 'Open',
                estimatedCost: wo.estimatedCost || 0,
                actualCost: wo.actualCost || 0,
                title: wo.title,
                description: wo.description,
                createdAt: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                rejectReason: wo.rejectReason || null,
                resolutionNotes: wo.resolutionNotes || null,
            }));
            const formattedServiceRequests = serviceRequests.map((sr) => ({
                id: sr.id,
                workOrderNumber: `#${sr.id.slice(0, 8)}`,
                propertyId: sr.propertyId,
                propertyName: sr.propertyName || 'Property',
                unitNumber: sr.unitNumber ? (sr.unitNumber.toLowerCase().includes('unit') ? sr.unitNumber : `Unit ${sr.unitNumber}`) : 'Unit 101',
                vendorId: sr.assignedVendorId || '',
                vendorName: sr.assignedVendorName || 'Unassigned',
                assignedTechnician: sr.assignedTechnician || sr.assignedVendorName || 'Unassigned',
                scheduledDate: sr.scheduledDate || (sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                priority: sr.priority === 'Normal' ? 'Medium' : sr.priority || 'Medium',
                status: sr.status === 'Open' || sr.status === 'New' || sr.status === 'Submitted' ? 'Open' : sr.status === 'InProgress' || sr.status === 'In Progress' ? 'In Progress' : sr.status === 'Completed' ? 'Completed' : sr.status === 'Closed' ? 'Closed' : sr.status === 'Rejected' ? 'Rejected' : sr.status === 'Assigned' ? 'Assigned' : sr.status || 'Open',
                estimatedCost: sr.estimatedCost || sr.cost || 0,
                actualCost: sr.cost || 0,
                title: sr.title,
                description: sr.description || '',
                createdAt: sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                rejectReason: sr.notes || null,
                resolutionNotes: null,
            }));
            const combined = [...formattedServiceRequests, ...formattedWorkOrders];
            return (0, apiResponse_js_1.sendSuccess)({ res, data: combined });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const id = req.params['id'];
            const companyId = req.user?.companyId;
            const wo = await database_js_1.default.workOrder.findFirst({
                where: companyId ? { id, companyId } : { id },
                include: { property: true, vendor: true },
            });
            if (wo) {
                return (0, apiResponse_js_1.sendSuccess)({
                    res,
                    data: {
                        id: wo.id,
                        workOrderNumber: `WO-${wo.id.slice(0, 8)}`,
                        propertyId: wo.propertyId,
                        propertyName: wo.property?.name || 'Oakridge Heights',
                        unitNumber: 'Unit 102',
                        vendorId: wo.vendorId || '',
                        vendorName: wo.vendor?.companyName || 'ProFix Solutions',
                        assignedTechnician: wo.vendor?.contactName || 'Technician Lead 1',
                        scheduledDate: new Date().toISOString().split('T')[0],
                        priority: wo.priority || 'Normal',
                        status: wo.status === 'Open' ? 'Open' : wo.status === 'InProgress' ? 'In Progress' : wo.status === 'Completed' ? 'Completed' : wo.status === 'Cancelled' ? 'Cancelled' : wo.status || 'Open',
                        estimatedCost: wo.estimatedCost || 0,
                        actualCost: wo.actualCost || 0,
                        title: wo.title,
                        description: wo.description,
                        createdAt: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        rejectReason: wo.rejectReason || null,
                        resolutionNotes: wo.resolutionNotes || null,
                    },
                });
            }
            const sr = await database_js_1.default.serviceRequest.findFirst({
                where: companyId ? { id, companyId } : { id },
            });
            if (sr) {
                return (0, apiResponse_js_1.sendSuccess)({
                    res,
                    data: {
                        id: sr.id,
                        workOrderNumber: `SR-${sr.id.slice(0, 8)}`,
                        propertyId: sr.propertyId,
                        propertyName: sr.propertyName || 'Oakridge Heights',
                        unitNumber: sr.unitNumber ? `Unit ${sr.unitNumber}` : 'Unit 102',
                        vendorId: sr.assignedVendorId || '',
                        vendorName: sr.assignedVendorName || 'ProFix Solutions',
                        assignedTechnician: sr.assignedVendorName || sr.assignedTechnician || 'Technician Lead 1',
                        scheduledDate: sr.scheduledDate || new Date().toISOString().split('T')[0],
                        priority: sr.priority || 'Normal',
                        status: sr.status === 'Open' || sr.status === 'New' ? 'Open' : sr.status === 'InProgress' || sr.status === 'In Progress' ? 'In Progress' : sr.status === 'Completed' ? 'Completed' : sr.status === 'Closed' ? 'Closed' : sr.status === 'Rejected' ? 'Rejected' : sr.status === 'Assigned' ? 'Assigned' : sr.status || 'Open',
                        estimatedCost: sr.estimatedCost || sr.cost || 0,
                        actualCost: sr.cost || 0,
                        title: sr.title,
                        description: sr.description,
                        createdAt: sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        rejectReason: sr.notes || null,
                        resolutionNotes: null,
                    },
                });
            }
            return res.status(404).json({ success: false, error: { message: 'Task not found' } });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { propertyId, title, description, vendorId, priority, status, estimatedCost, actualCost } = req.body;
            const companyId = req.user?.companyId;
            const workOrder = await database_js_1.default.workOrder.create({
                data: {
                    propertyId,
                    title,
                    description,
                    vendorId: vendorId || null,
                    priority: priority || 'Normal',
                    status: status || 'Open',
                    estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
                    actualCost: actualCost ? parseFloat(actualCost) : null,
                    companyId,
                },
                include: { property: true, vendor: true },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, statusCode: 201, data: workOrder });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const id = req.params['id'];
            const { status, priority, estimatedCost, actualCost, vendorId, rejectReason, resolutionNotes } = req.body;
            const companyId = req.user?.companyId;
            const statusMap = {
                'Open': 'Open',
                'New': 'Submitted',
                'Submitted': 'Submitted',
                'Approved': 'Approved',
                'Assigned': 'Assigned',
                'Accepted': 'Accepted',
                'InProgress': 'InProgress',
                'In Progress': 'InProgress',
                'Completed': 'Completed',
                'Rejected': 'Rejected',
                'Cancelled': 'Cancelled',
                'Closed': 'Closed',
                'Returned': 'Returned',
            };
            const finalStatus = status ? (statusMap[status] ?? status) : undefined;
            // 1. Check ServiceRequest table
            const existingSr = await database_js_1.default.serviceRequest.findUnique({ where: { id } });
            if (existingSr) {
                const srStatus = finalStatus === 'InProgress' ? 'In Progress' : finalStatus;
                const updatedSr = await database_js_1.default.serviceRequest.update({
                    where: { id },
                    data: {
                        ...(srStatus && { status: srStatus }),
                        ...(actualCost !== undefined && { cost: parseFloat(String(actualCost)) }),
                        ...(estimatedCost !== undefined && { estimatedCost: parseFloat(String(estimatedCost)) }),
                        ...(rejectReason && { notes: rejectReason }),
                    },
                });
                return (0, apiResponse_js_1.sendSuccess)({ res, data: updatedSr });
            }
            // 2. Check WorkOrder table
            const existingWo = await database_js_1.default.workOrder.findUnique({ where: { id } });
            if (existingWo) {
                const workOrder = await database_js_1.default.workOrder.update({
                    where: { id },
                    data: {
                        ...(finalStatus && { status: finalStatus }),
                        ...(priority && { priority }),
                        ...(estimatedCost !== undefined && { estimatedCost: parseFloat(String(estimatedCost)) }),
                        ...(actualCost !== undefined && { actualCost: parseFloat(String(actualCost)) }),
                        ...(vendorId && { vendorId }),
                        ...(rejectReason && { rejectReason }),
                        ...(resolutionNotes && { resolutionNotes }),
                    },
                    include: { property: true, vendor: true },
                });
                return (0, apiResponse_js_1.sendSuccess)({ res, data: workOrder });
            }
            return res.status(404).json({ success: false, error: { message: 'Task not found' } });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            const id = req.params['id'];
            const companyId = req.user?.companyId;
            if (companyId) {
                const check = await database_js_1.default.workOrder.findFirst({
                    where: { id, companyId },
                });
                if (!check)
                    throw new Error('WorkOrder not found.');
            }
            await database_js_1.default.workOrder.delete({ where: { id } });
            return (0, apiResponse_js_1.sendSuccess)({ res, data: { deleted: true } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WorkOrderController = WorkOrderController;
exports.workOrderController = new WorkOrderController();

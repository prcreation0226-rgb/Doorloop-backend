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
            let workOrders = await database_js_1.default.workOrder.findMany({
                where: companyId ? { companyId } : {},
                include: { property: true, vendor: true },
                orderBy: { createdAt: 'desc' },
            });
            // Seed sample work orders if DB is empty for this company
            if (workOrders.length === 0) {
                const property = await database_js_1.default.property.findFirst({
                    where: companyId ? { companyId } : {},
                });
                const vendor = await database_js_1.default.vendor.findFirst();
                const propertyId = property?.id || 'default-property';
                const vendorId = vendor?.id || null;
                const seeds = [
                    { propertyId, title: 'HVAC Filter Replacement & Diagnostics', description: 'Tenant reports AC not cooling. Replace filters and run full diagnostic.', vendorId, priority: 'High', status: 'InProgress', estimatedCost: 350, actualCost: 0, companyId },
                    { propertyId, title: 'Water Heater Element Replacement', description: 'Replaced faulty heating element and flushed 50 gal tank.', vendorId, priority: 'Normal', status: 'Completed', estimatedCost: 300, actualCost: 280, companyId },
                    { propertyId, title: 'Electrical Outlet Repair – Unit 204', description: 'Outlets in kitchen not functioning. Check breaker and wiring.', vendorId, priority: 'High', status: 'Open', estimatedCost: 200, actualCost: 0, companyId },
                    { propertyId, title: 'Plumbing Leak Under Sink', description: 'Tenant reports slow leak under kitchen sink. Inspect P-trap and supply lines.', vendorId, priority: 'Emergency', status: 'Open', estimatedCost: 180, actualCost: 0, companyId },
                    { propertyId, title: 'Roof Inspection Post-Storm', description: 'Heavy rain caused minor ceiling stain in Unit 305. Inspect for water intrusion.', vendorId, priority: 'Normal', status: 'Open', estimatedCost: 500, actualCost: 0, companyId },
                ];
                await database_js_1.default.workOrder.createMany({ data: seeds });
                workOrders = await database_js_1.default.workOrder.findMany({
                    where: companyId ? { companyId } : {},
                    include: { property: true, vendor: true },
                    orderBy: { createdAt: 'desc' },
                });
            }
            const formatted = workOrders.map((wo, index) => ({
                id: wo.id,
                workOrderNumber: `WO-${40001 + index}`,
                propertyId: wo.propertyId,
                propertyName: wo.property?.name || 'Oakridge Heights',
                unitNumber: 'Unit 102',
                vendorId: wo.vendorId || '',
                vendorName: wo.vendor?.companyName || 'ProFix Solutions',
                assignedTechnician: 'Technician Lead 1',
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
            }));
            return (0, apiResponse_js_1.sendSuccess)({ res, data: formatted });
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
            if (companyId) {
                const check = await database_js_1.default.workOrder.findFirst({
                    where: { id, companyId },
                });
                if (!check)
                    throw new Error('WorkOrder not found.');
            }
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
            // Assign manager tracking fields on status transitions
            const managerUserId = req.user?.userId;
            const approvedByManagerId = finalStatus === 'Approved' || finalStatus === 'Assigned' ? managerUserId : undefined;
            const closedByManagerId = finalStatus === 'Closed' ? managerUserId : undefined;
            const workOrder = await database_js_1.default.workOrder.update({
                where: { id },
                data: {
                    ...(finalStatus && { status: finalStatus }),
                    ...(priority && { priority }),
                    ...(estimatedCost !== undefined && { estimatedCost: parseFloat(estimatedCost) }),
                    ...(actualCost !== undefined && { actualCost: parseFloat(actualCost) }),
                    ...(vendorId && { vendorId }),
                    ...(req.body.staffId && { staffId: req.body.staffId }),
                    ...(approvedByManagerId && { approvedByManagerId }),
                    ...(closedByManagerId && { closedByManagerId }),
                    ...(rejectReason && { rejectReason }),
                    ...(resolutionNotes && { resolutionNotes }),
                    ...(req.body.labourCost !== undefined && { labourCost: parseFloat(req.body.labourCost) }),
                    ...(req.body.materialsCost !== undefined && { materialsCost: parseFloat(req.body.materialsCost) }),
                    ...(req.body.extraExpenses !== undefined && { extraExpenses: parseFloat(req.body.extraExpenses) }),
                },
                include: { property: true, vendor: true },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, data: workOrder });
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

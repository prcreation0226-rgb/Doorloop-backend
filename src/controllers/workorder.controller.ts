import { Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class WorkOrderController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      let workOrders = await prisma.workOrder.findMany({
        where: companyId ? { companyId } : {},
        include: { property: true, vendor: true },
        orderBy: { createdAt: 'desc' },
      });

      // Seed sample work orders if DB is empty for this company
      if (workOrders.length === 0) {
        const property = await prisma.property.findFirst({
          where: companyId ? { companyId } : {},
        });
        const vendor = await prisma.vendor.findFirst();
        const propertyId = property?.id || 'default-property';
        const vendorId = vendor?.id || null;

        const seeds = [
          { propertyId, title: 'HVAC Filter Replacement & Diagnostics', description: 'Tenant reports AC not cooling. Replace filters and run full diagnostic.', vendorId, priority: 'High', status: 'InProgress', estimatedCost: 350, actualCost: 0, companyId },
          { propertyId, title: 'Water Heater Element Replacement', description: 'Replaced faulty heating element and flushed 50 gal tank.', vendorId, priority: 'Normal', status: 'Completed', estimatedCost: 300, actualCost: 280, companyId },
          { propertyId, title: 'Electrical Outlet Repair – Unit 204', description: 'Outlets in kitchen not functioning. Check breaker and wiring.', vendorId, priority: 'High', status: 'Open', estimatedCost: 200, actualCost: 0, companyId },
          { propertyId, title: 'Plumbing Leak Under Sink', description: 'Tenant reports slow leak under kitchen sink. Inspect P-trap and supply lines.', vendorId, priority: 'Emergency', status: 'Open', estimatedCost: 180, actualCost: 0, companyId },
          { propertyId, title: 'Roof Inspection Post-Storm', description: 'Heavy rain caused minor ceiling stain in Unit 305. Inspect for water intrusion.', vendorId, priority: 'Normal', status: 'Open', estimatedCost: 500, actualCost: 0, companyId },
        ];

        await prisma.workOrder.createMany({ data: seeds as any[] });
        workOrders = await prisma.workOrder.findMany({
          where: companyId ? { companyId } : {},
          include: { property: true, vendor: true },
          orderBy: { createdAt: 'desc' },
        });
      }

      const formatted = workOrders.map((wo: any, index: number) => ({
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

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { propertyId, title, description, vendorId, priority, status, estimatedCost, actualCost } = req.body;
      const companyId = req.user?.companyId;
      const workOrder = await prisma.workOrder.create({
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
      return sendSuccess({ res, statusCode: 201, data: workOrder });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const { status, priority, estimatedCost, actualCost, vendorId, rejectReason, resolutionNotes } = req.body;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.workOrder.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('WorkOrder not found.');
      }

      const statusMap: Record<string, string> = {
        'Open': 'Open', 'In Progress': 'InProgress', 'InProgress': 'InProgress',
        'Completed': 'Completed', 'Cancelled': 'Cancelled', 'Closed': 'Closed',
      };

      const workOrder = await prisma.workOrder.update({
        where: { id },
        data: {
          ...(status && { status: statusMap[status] ?? status }),
          ...(priority && { priority }),
          ...(estimatedCost !== undefined && { estimatedCost: parseFloat(estimatedCost) }),
          ...(actualCost !== undefined && { actualCost: parseFloat(actualCost) }),
          ...(vendorId && { vendorId }),
          ...(rejectReason && { rejectReason }),
          ...(resolutionNotes && { resolutionNotes }),
        },
        include: { property: true, vendor: true },
      });
      return sendSuccess({ res, data: workOrder });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.workOrder.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('WorkOrder not found.');
      }

      await prisma.workOrder.delete({ where: { id } });
      return sendSuccess({ res, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const workOrderController = new WorkOrderController();

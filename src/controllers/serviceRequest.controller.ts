import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

class ServiceRequestController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      let requests = await prisma.serviceRequest.findMany({
        where: companyId ? { companyId } : {},
        orderBy: { createdAt: 'desc' },
      });

      // Seed sample service requests if DB is empty for this company
      if (requests.length === 0) {
        const property = await prisma.property.findFirst({
          where: companyId ? { companyId } : {},
        });
        const tenant = await prisma.tenant.findFirst({
          where: companyId ? { companyId } : {},
        });
        const vendor = await prisma.vendor.findFirst();

        const propertyId = property?.id || 'default-property';
        const propertyName = property?.name || 'Oakridge Heights';
        const tenantId = tenant?.id;
        const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Alex Mercer';
        const vendorName = vendor?.companyName || 'ProFix Solutions';
        const vendorId = vendor?.id;

        const seeds = [
          {
            title: 'AC Not Cooling – Unit 204',
            description: 'Tenant reports the HVAC unit is not producing cool air. Temperature inside exceeds 85°F.',
            propertyId, propertyName, unitNumber: '204', tenantId, tenantName,
            priority: 'High', status: 'In Progress', category: 'HVAC',
            assignedVendorId: vendorId, assignedVendorName: vendorName,
            assignedTechnician: 'Technician Lead 1',
            estimatedCost: 350, cost: 350, scheduledDate: new Date().toISOString().split('T')[0],
            messages: JSON.stringify([
              { id: 'msg-1', senderName: tenantName, role: 'Tenant', text: 'AC stopped working last night. Very hot inside.', timestamp: '2026-07-24 09:12 AM' },
              { id: 'msg-2', senderName: 'Property Manager', role: 'Manager', text: 'Vendor dispatched. They will arrive by 2 PM.', timestamp: '2026-07-24 10:30 AM' },
            ]),
            companyId,
          },
          {
            title: 'Water Leak Under Kitchen Sink',
            description: 'Slow drip under kitchen sink. Tenant reports cabinet floor is wet.',
            propertyId, propertyName, unitNumber: '102', tenantId, tenantName,
            priority: 'Emergency', status: 'New', category: 'Plumbing',
            estimatedCost: 180, cost: 0,
            messages: JSON.stringify([]),
            companyId,
          },
          {
            title: 'Broken Window Latch – Unit 303',
            description: 'Window latch broken, cannot secure window. Security concern.',
            propertyId, propertyName, unitNumber: '303', tenantId, tenantName,
            priority: 'Normal', status: 'Completed', category: 'General',
            assignedVendorId: vendorId, assignedVendorName: vendorName,
            estimatedCost: 120, cost: 95, scheduledDate: '2026-07-20',
            messages: JSON.stringify([
              { id: 'msg-3', senderName: 'Property Manager', role: 'Manager', text: 'Repair completed. Window latch replaced.', timestamp: '2026-07-20 03:45 PM' },
            ]),
            companyId,
          },
          {
            title: 'Dryer Not Heating – Unit 408',
            description: 'Laundry dryer runs but does not heat. Tenant cannot dry clothes.',
            propertyId, propertyName, unitNumber: '408', tenantId, tenantName,
            priority: 'Normal', status: 'Assigned', category: 'Electrical',
            assignedVendorId: vendorId, assignedVendorName: vendorName,
            estimatedCost: 200, cost: 200, scheduledDate: new Date().toISOString().split('T')[0],
            messages: JSON.stringify([]),
            companyId,
          },
          {
            title: 'Hallway Light Flickering',
            description: 'Common area hallway light on 2nd floor is flickering. Possible wiring issue.',
            propertyId, propertyName, unitNumber: 'Common', tenantId, tenantName,
            priority: 'Low', status: 'New', category: 'Electrical',
            messages: JSON.stringify([]),
            companyId,
          },
        ];

        await prisma.serviceRequest.createMany({ data: seeds });
        requests = await prisma.serviceRequest.findMany({
          where: companyId ? { companyId } : {},
          orderBy: { createdAt: 'desc' },
        });
      }

      const formatted = requests.map((r: any, index: number) => ({
        ...r,
        id: r.id,
        requestNumber: `SR-${2001 + index}`,
        messages: (() => {
          try { return JSON.parse(r.messages as string); } catch { return []; }
        })(),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;
      const request = await prisma.serviceRequest.findFirst({
        where: companyId ? { id, companyId } : { id },
      });
      if (!request) {
        return res.status(404).json({ success: false, error: { message: 'Service request not found' } });
      }
      return sendSuccess({ res, data: {
        ...request,
        messages: (() => {
          try { return JSON.parse(request.messages as string); } catch { return []; }
        })(),
      }});
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        title, description, propertyId, propertyName, unitNumber,
        tenantId, tenantName, priority, status, category,
        assignedVendorId, assignedVendorName, assignedTechnician,
        estimatedCost, cost, scheduledDate, notes,
      } = req.body;
      const companyId = req.user?.companyId;

      const request = await prisma.serviceRequest.create({
        data: {
          title: title || 'Untitled Request',
          description: description || '',
          propertyId: propertyId || 'default',
          propertyName: propertyName || 'Unknown Property',
          unitNumber: unitNumber || '',
          tenantId: tenantId || null,
          tenantName: tenantName || 'Unknown Tenant',
          priority: priority || 'Normal',
          status: status || 'New',
          category: category || 'General',
          assignedVendorId: assignedVendorId || null,
          assignedVendorName: assignedVendorName || null,
          assignedTechnician: assignedTechnician || null,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
          cost: cost ? parseFloat(cost) : null,
          scheduledDate: scheduledDate || null,
          notes: notes || null,
          messages: '[]',
          companyId,
        },
      });

      return sendSuccess({ res, statusCode: 201, data: { ...request, messages: [], requestNumber: `SR-${Date.now()}` } });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { newMessage, status, priority, assignedVendorId, assignedVendorName, assignedTechnician, estimatedCost, cost, scheduledDate, notes } = req.body;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.serviceRequest.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('ServiceRequest not found.');
      }

      // Get current messages if adding a new one
      let messagesData: string | undefined;
      if (newMessage) {
        const current = await prisma.serviceRequest.findUnique({ where: { id } });
        let msgs: any[] = [];
        try { msgs = JSON.parse((current?.messages as string) || '[]'); } catch {}
        msgs.push({
          id: `msg-${Date.now()}`,
          senderName: newMessage.senderName,
          role: newMessage.role,
          text: newMessage.text,
          timestamp: new Date().toLocaleString(),
        });
        messagesData = JSON.stringify(msgs);
      }

      const request = await prisma.serviceRequest.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(priority && { priority }),
          ...(assignedVendorId !== undefined && { assignedVendorId }),
          ...(assignedVendorName !== undefined && { assignedVendorName }),
          ...(assignedTechnician !== undefined && { assignedTechnician }),
          ...(estimatedCost !== undefined && { estimatedCost: parseFloat(estimatedCost) }),
          ...(cost !== undefined && { cost: parseFloat(cost) }),
          ...(scheduledDate !== undefined && { scheduledDate }),
          ...(notes !== undefined && { notes }),
          ...(messagesData !== undefined && { messages: messagesData }),
        },
      });

      return sendSuccess({ res, data: {
        ...request,
        messages: (() => {
          try { return JSON.parse(request.messages as string); } catch { return []; }
        })(),
      }});
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.serviceRequest.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('ServiceRequest not found.');
      }

      await prisma.serviceRequest.delete({ where: { id } });
      return sendSuccess({ res, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const serviceRequestController = new ServiceRequestController();

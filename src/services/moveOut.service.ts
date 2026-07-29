import prisma from '../config/database';
import { MoveOutStatus, LeaseStatus, UnitStatus, TenantStatus, DamageDecision } from '@prisma/client';

export class MoveOutService {
  async getAllMoveOuts(companyId?: string, status?: string) {
    return prisma.moveOut.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            tenant: true,
          },
        },
        inspections: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async getMoveOutById(id: string, companyId?: string) {
    return prisma.moveOut.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            tenant: true,
          },
        },
        inspections: {
          include: {
            assignedInspector: true,
            rooms: {
              include: {
                items: {
                  include: {
                    photos: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        damageItems: true,
        depositSummary: true,
      },
    });
  }

  async createMoveOut(data: any) {
    // Determine the unitId from the lease if not supplied
    let unitId = data.unitId;
    if (!unitId) {
      const lease = await prisma.lease.findUnique({ where: { id: data.leaseId } });
      if (!lease) throw new Error('Lease not found');
      unitId = lease.unitId;
    }

    return prisma.moveOut.create({
      data: {
        leaseId: data.leaseId,
        unitId,
        scheduledDate: new Date(data.scheduledDate),
        status: 'SCHEDULED',
        notes: data.notes,
        createdBy: data.createdBy || 'System',
        companyId: data.companyId,
      },
    });
  }

  async updateMoveOut(id: string, data: any, companyId?: string) {
    const moveOut = await prisma.moveOut.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
    });
    if (!moveOut) throw new Error('Move Out record not found');

    if (moveOut.status === 'COMPLETED') {
      throw new Error('Cannot update completed Move Out record');
    }

    const updateData: any = {};
    if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status) updateData.status = data.status;

    const updatedMoveOut = await prisma.moveOut.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: `Move Out Updated: Status ${updatedMoveOut.status}`,
        userId: data.userId || null,
        module: 'Leasing',
        object: `MoveOut ${id}`,
        ip: '127.0.0.1',
        status: 'Success',
      },
    });

    return updatedMoveOut;
  }

  async startInspection(moveOutId: string, templateId: string, userId: string, companyId?: string) {
    const moveOut = await prisma.moveOut.findFirst({
      where: { id: moveOutId, ...(companyId ? { companyId } : {}) },
      include: { unit: true },
    });
    if (!moveOut) throw new Error('Move Out not found');

    // Retrieve inspection template
    const template = await prisma.inspectionTemplate.findFirst({
      where: { id: templateId, ...(companyId ? { companyId } : {}) },
      include: {
        rooms: {
          include: { items: true },
        },
      },
    });
    if (!template) throw new Error('Inspection template not found');

    // Generate inspection number
    const count = await prisma.inspection.count();
    const inspectionNumber = `MO-${String(count + 1).padStart(6, '0')}`;

    return prisma.$transaction(async (tx) => {
      // 1. Create inspection snapshot
      const inspection = await tx.inspection.create({
        data: {
          inspectionNumber,
          type: 'MOVE_OUT',
          moveOutId,
          templateId,
          templateName: template.name,
          status: 'IN_PROGRESS',
          createdBy: userId,
          companyId,
        },
      });

      // 2. Clone template rooms and items
      for (const room of template.rooms) {
        const clonedRoom = await tx.inspectionRoom.create({
          data: {
            inspectionId: inspection.id,
            name: room.name,
            sortOrder: room.sortOrder,
          },
        });

        for (const item of room.items) {
          await tx.inspectionItem.create({
            data: {
              roomId: clonedRoom.id,
              label: item.label,
              required: item.required,
              sortOrder: item.sortOrder,
              completed: false,
            },
          });
        }
      }

      // 3. Update MoveOut workflow status
      await tx.moveOut.update({
        where: { id: moveOutId },
        data: { status: 'INSPECTION_IN_PROGRESS' },
      });

      return inspection;
    });
  }

  async submitDamageReview(moveOutId: string, items: any[], userId: string, companyId?: string) {
    const moveOut = await prisma.moveOut.findFirst({
      where: { id: moveOutId, ...(companyId ? { companyId } : {}) },
    });
    if (!moveOut) throw new Error('Move Out not found');

    return prisma.$transaction(async (tx) => {
      // Clear previous damage review items if any
      await tx.damageReviewItem.deleteMany({
        where: { moveOutId },
      });

      // Create new review items
      for (const item of items) {
        await tx.damageReviewItem.create({
          data: {
            moveOutId,
            inspectionItemId: item.inspectionItemId,
            roomName: item.roomName,
            itemLabel: item.itemLabel,
            condition: item.condition,
            notes: item.notes,
            decision: item.decision as DamageDecision,
            chargeAmount: item.chargeAmount ? parseFloat(item.chargeAmount) : 0,
            reviewedBy: userId,
            reviewedAt: new Date(),
          },
        });
      }

      // Update MoveOut status to READY_FOR_COMPLETION or DAMAGE_REVIEW
      const updatedMoveOut = await tx.moveOut.update({
        where: { id: moveOutId },
        data: { status: 'READY_FOR_COMPLETION' },
      });

      return updatedMoveOut;
    });
  }

  async saveDepositSummary(moveOutId: string, data: any) {
    return prisma.moveOutDepositSummary.upsert({
      where: { moveOutId },
      create: {
        moveOutId,
        originalDeposit: parseFloat(data.originalDeposit),
        totalCharges: parseFloat(data.totalCharges || 0),
        refundAmount: parseFloat(data.refundAmount || 0),
        notes: data.notes,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedBy ? new Date() : null,
      },
      update: {
        originalDeposit: parseFloat(data.originalDeposit),
        totalCharges: parseFloat(data.totalCharges || 0),
        refundAmount: parseFloat(data.refundAmount || 0),
        notes: data.notes,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedBy ? new Date() : null,
      },
    });
  }

  async completeMoveOut(id: string, userId?: string, companyId?: string) {
    const moveOut = await prisma.moveOut.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
      include: {
        lease: true,
        unit: true,
        inspections: true,
      },
    });

    if (!moveOut) throw new Error('Move Out record not found');
    if (moveOut.status === 'COMPLETED') throw new Error('Move Out is already completed');

    // Validate that Lease is Active
    if (moveOut.lease.status !== 'Active') {
      throw new Error(`Lease status must be 'Active' to complete Move Out. Current: ${moveOut.lease.status}`);
    }

    // Validate that at least one inspection is completed
    const completedInspections = moveOut.inspections.filter((ins) => ins.status === 'COMPLETED');
    if (completedInspections.length === 0) {
      throw new Error('An inspection must be completed before finishing the Move Out process');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update MoveOut status
      const updatedMoveOut = await tx.moveOut.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
        },
      });

      // 2. Update Lease status to Ended
      await tx.lease.update({
        where: { id: moveOut.leaseId },
        data: {
          status: 'Ended',
        },
      });

      // 3. Update Unit status to Vacant_Needs_Preparation (not Available)
      await tx.unit.update({
        where: { id: moveOut.unitId },
        data: {
          status: 'Vacant_Needs_Preparation',
        },
      });

      // 4. Update Tenant status to Inactive
      await tx.tenant.update({
        where: { id: moveOut.lease.tenantId },
        data: {
          status: 'Inactive',
        },
      });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          action: 'Move Out Completed & Lease Ended',
          userId: userId || null,
          module: 'Leasing',
          object: `MoveOut ${id}`,
          ip: '127.0.0.1',
          status: 'Success',
        },
      });

      return updatedMoveOut;
    });
  }

  async cancelMoveOut(id: string, reason: string, userId?: string, companyId?: string) {
    const moveOut = await prisma.moveOut.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
    });
    if (!moveOut) throw new Error('Move Out record not found');
    if (moveOut.status === 'COMPLETED') throw new Error('Cannot cancel a completed Move Out');

    return prisma.moveOut.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledBy: userId,
        cancelledAt: new Date(),
      },
    });
  }
}

export const moveOutService = new MoveOutService();

import prisma from '../config/database';

const DEFAULT_MODULES = [
  'Dashboard', 'Properties', 'Leasing', 'Tenants', 'Documents', 
  'Owners', 'Rent & Payments', 'Accounting', 'Maintenance', 
  'Reports', 'Communication', 'Company Settings', 'AI Assistant'
];

export class RoleService {
  private formatPermission(dbPerm: any) {
    return {
      module: dbPerm.module,
      view: dbPerm.canView,
      create: dbPerm.canCreate,
      edit: dbPerm.canEdit,
      delete: dbPerm.canDelete,
      approve: dbPerm.canApprove,
      export: dbPerm.canExport
    };
  }

  async getAllRoles(companyId: string) {
    if (!companyId) return [];

    // Auto-heal/seed default roles for this company if they don't exist
    await this.ensureDefaultRoles(companyId);

    const roles = await prisma.role.findMany({
      where: { companyId },
      include: { permissions: true }
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isCustom: role.isCustom,
      permissions: role.permissions.map(p => this.formatPermission(p))
    }));
  }

  async createRole(companyId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description || '',
          isCustom: true,
          companyId,
        }
      });

      // Create permissions block
      if (data.permissions && Array.isArray(data.permissions)) {
        await tx.permission.createMany({
          data: data.permissions.map((p: any) => ({
            roleId: role.id,
            module: p.module,
            canView: !!p.view,
            canCreate: !!p.create,
            canEdit: !!p.edit,
            canDelete: !!p.delete,
            canApprove: !!p.approve,
            canExport: !!p.export
          }))
        });
      } else {
        // Default empty permissions
        await tx.permission.createMany({
          data: DEFAULT_MODULES.map(m => ({
            roleId: role.id,
            module: m,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canApprove: false,
            canExport: false
          }))
        });
      }

      const createdRole = await tx.role.findUnique({
        where: { id: role.id },
        include: { permissions: true }
      });

      return {
        id: createdRole!.id,
        name: createdRole!.name,
        description: createdRole!.description,
        isCustom: createdRole!.isCustom,
        permissions: createdRole!.permissions.map(p => this.formatPermission(p))
      };
    });
  }

  async updateRolePermissions(id: string, companyId: string, data: any) {
    const role = await prisma.role.findFirst({
      where: { id, companyId }
    });
    if (!role) throw new Error('Role not found or access denied.');

    // Update details if provided
    await prisma.role.update({
      where: { id },
      data: {
        description: data.description !== undefined ? data.description : undefined
      }
    });

    // Update permissions
    if (data.permissions && Array.isArray(data.permissions)) {
      await Promise.all(data.permissions.map(async (p: any) => {
        const existing = await prisma.permission.findFirst({
          where: { roleId: id, module: p.module }
        });
        if (existing) {
          await prisma.permission.update({
            where: { id: existing.id },
            data: {
              canView: p.view !== undefined ? !!p.view : undefined,
              canCreate: p.create !== undefined ? !!p.create : undefined,
              canEdit: p.edit !== undefined ? !!p.edit : undefined,
              canDelete: p.delete !== undefined ? !!p.delete : undefined,
              canApprove: p.approve !== undefined ? !!p.approve : undefined,
              canExport: p.export !== undefined ? !!p.export : undefined,
            }
          });
        } else {
          await prisma.permission.create({
            data: {
              roleId: id,
              module: p.module,
              canView: !!p.view,
              canCreate: !!p.create,
              canEdit: !!p.edit,
              canDelete: !!p.delete,
              canApprove: !!p.approve,
              canExport: !!p.export
            }
          });
        }
      }));
    }

    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true }
    });

    return {
      id: updatedRole!.id,
      name: updatedRole!.name,
      description: updatedRole!.description,
      isCustom: updatedRole!.isCustom,
      permissions: updatedRole!.permissions.map(p => this.formatPermission(p))
    };
  }

  async cloneRole(id: string, companyId: string, newName: string) {
    const roleToClone = await prisma.role.findFirst({
      where: { id, companyId },
      include: { permissions: true }
    });
    if (!roleToClone) throw new Error('Role to clone not found.');

    return prisma.$transaction(async (tx) => {
      const clonedRole = await tx.role.create({
        data: {
          name: newName,
          description: `Cloned from ${roleToClone.name}`,
          isCustom: true,
          companyId
        }
      });
      await tx.permission.createMany({
        data: roleToClone.permissions.map(p => ({
          roleId: clonedRole.id,
          module: p.module,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          canApprove: p.canApprove,
          canExport: p.canExport
        }))
      });

      const fullCloned = await tx.role.findUnique({
        where: { id: clonedRole.id },
        include: { permissions: true }
      });
      return {
        id: fullCloned!.id,
        name: fullCloned!.name,
        description: fullCloned!.description,
        isCustom: fullCloned!.isCustom,
        permissions: fullCloned!.permissions.map(p => this.formatPermission(p))
      };
    });
  }

  async deleteRole(id: string, companyId: string) {
    const role = await prisma.role.findFirst({
      where: { id, companyId, isCustom: true }
    });
    if (!role) throw new Error('Role not found, not custom, or access denied.');

    await prisma.role.delete({
      where: { id }
    });
    return { success: true };
  }

  private async ensureDefaultRoles(companyId: string) {
    // 1. Property Manager
    const pmExists = await prisma.role.findFirst({
      where: { name: 'Property Manager', companyId }
    });
    if (!pmExists) {
      await prisma.$transaction(async (tx) => {
        const pmRole = await tx.role.create({
          data: {
            name: 'Property Manager',
            description: 'Master account with full administrative and module access permissions.',
            isCustom: false,
            companyId
          }
        });
        await tx.permission.createMany({
          data: DEFAULT_MODULES.map(m => ({
            roleId: pmRole.id,
            module: m,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canApprove: true,
            canExport: true
          }))
        });
      });
    }

    // 2. Team Manager
    const tmExists = await prisma.role.findFirst({
      where: { name: 'Team Manager', companyId }
    });
    if (!tmExists) {
      await prisma.$transaction(async (tx) => {
        const tmRole = await tx.role.create({
          data: {
            name: 'Team Manager',
            description: 'Configurable sub-manager account managed by Property Manager.',
            isCustom: false,
            companyId
          }
        });
        await tx.permission.createMany({
          data: DEFAULT_MODULES.map(m => ({
            roleId: tmRole.id,
            module: m,
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canApprove: false,
            canExport: false
          }))
        });
      });
    }
  }
}

export const roleService = new RoleService();

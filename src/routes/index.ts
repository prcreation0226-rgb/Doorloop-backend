import { Router } from 'express';
import authRoutes from './auth.routes';
import propertyRoutes from './property.routes';
import leaseRoutes from './lease.routes';
import paymentRoutes from './payment.routes';
import accountingRoutes from './accounting.routes';
import tenantRoutes from './tenant.routes';
import ownerRoutes from './owner.routes';
import vendorRoutes from './vendor.routes';
import workOrderRoutes from './workorder.routes';
import dashboardRoutes from './dashboard.routes';
import secondaryRoutes from './secondary.routes';
import portalRoutes from './portal.routes';
import buildingRoutes from './building.routes';
import unitRoutes from './unit.routes';
import applicationRoutes from './application.routes';
import superAdminRoutes from './superadmin.routes';
import invoiceRoutes from './invoice.routes';
import serviceRequestRoutes from './serviceRequest.routes';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DoorLoop ERP Backend',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/properties', authMiddleware, propertyRoutes);
router.use('/leases', authMiddleware, leaseRoutes);
router.use('/payments', authMiddleware, paymentRoutes);
router.use('/accounting', authMiddleware, accountingRoutes);
router.use('/tenants', authMiddleware, tenantRoutes);
router.use('/owners', authMiddleware, ownerRoutes);
router.use('/vendors', authMiddleware, vendorRoutes);
router.use('/work-orders', authMiddleware, workOrderRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);
router.use('/portal', authMiddleware, portalRoutes);
router.use('/superadmin', authMiddleware, superAdminRoutes);
router.use('/invoices', authMiddleware, invoiceRoutes);
router.use('/service-requests', authMiddleware, serviceRequestRoutes);
router.use('/buildings', authMiddleware, buildingRoutes);
router.use('/units', authMiddleware, unitRoutes);
router.use('/applications', authMiddleware, applicationRoutes);
router.use('/', authMiddleware, secondaryRoutes);

export default router;

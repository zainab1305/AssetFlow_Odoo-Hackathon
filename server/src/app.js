import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import departmentRoutes from './routes/departments.js';
import categoryRoutes from './routes/categories.js';
import employeeRoutes from './routes/employees.js';
import assetRoutes from './routes/assets.js';
import allocationRoutes from './routes/allocations.js';
import bookingRoutes from './routes/bookings.js';
import maintenanceRoutes from './routes/maintenance.js';
import auditRoutes from './routes/audits.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AssetFlow API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
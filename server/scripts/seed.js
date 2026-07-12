import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import Category from '../src/models/Category.js';
import Asset from '../src/models/Asset.js';
import Allocation from '../src/models/Allocation.js';
import Booking from '../src/models/Booking.js';
import MaintenanceRequest from '../src/models/MaintenanceRequest.js';
import AuditCycle from '../src/models/AuditCycle.js';
import Notification from '../src/models/Notification.js';
import Activity from '../src/models/Activity.js';

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([
    Department.deleteMany(),
    Category.deleteMany(),
    Asset.deleteMany(),
    Allocation.deleteMany(),
    Booking.deleteMany(),
    MaintenanceRequest.deleteMany(),
    AuditCycle.deleteMany(),
    Notification.deleteMany(),
    Activity.deleteMany(),
  ]);

  const departments = await Department.insertMany([
    { name: 'Engineering', status: 'Active' },
    { name: 'Facilities', status: 'Active' },
    { name: 'Finance', status: 'Active' },
    { name: 'Operations', status: 'Inactive', parentDepartment: null },
  ]);

  const categories = await Category.insertMany([
    { name: 'Electronics', type: 'Asset', customFields: { warrantyPeriodMonths: 24, maintenanceCycleMonths: 12, notes: 'Devices and peripherals' }, status: 'Active' },
    { name: 'Furniture', type: 'Asset', customFields: { warrantyPeriodMonths: 12, maintenanceCycleMonths: 24, notes: 'Office furniture and seating' }, status: 'Active' },
    { name: 'Vehicles', type: 'Resource', customFields: { warrantyPeriodMonths: 36, maintenanceCycleMonths: 6, notes: 'Company fleet and transport' }, status: 'Active' },
    { name: 'Meeting Room', type: 'Resource', customFields: { maintenanceCycleMonths: 3, notes: 'Shared meeting spaces' }, status: 'Active' },
  ]);

  const seededUsers = [
    { name: 'Amina Khan', email: 'admin@assetflow.com', password: 'password123', role: 'Admin', status: 'Active', employeeId: 'EMP-0001' },
    { name: 'Irfan Shah', email: 'manager@assetflow.com', password: 'password123', role: 'Asset Manager', status: 'Active', employeeId: 'EMP-0002' },
    {
      name: 'Priya Shah',
      email: 'priya@assetflow.com',
      password: 'password123',
      role: 'Department Head',
      department: departments[0]._id,
      status: 'Active',
      employeeId: 'EMP-0003',
    },
    {
      name: 'Rohit Mehta',
      email: 'employee@assetflow.com',
      password: 'password123',
      role: 'Employee',
      department: departments[0]._id,
      status: 'Active',
      employeeId: 'EMP-0004',
    },
  ];

  const users = [];
  for (const userData of seededUsers) {
    const user = await User.findOne({ email: userData.email });
    if (user) {
      user.name = userData.name;
      user.password = userData.password;
      user.role = userData.role;
      user.department = userData.department || null;
      user.status = userData.status || 'Active';
      user.employeeId = userData.employeeId;
      await user.save();
      users.push(user);
      continue;
    }
    users.push(await User.create(userData));
  }

  await Department.findByIdAndUpdate(departments[0]._id, { head: users[2]._id, parentDepartment: null, status: 'Active' });

  const assets = await Asset.create([
    {
      assetId: 'AF-001',
      name: 'Dell Latitude 5440',
      category: categories[0]._id,
      department: departments[0]._id,
      location: 'HQ - Floor 2',
      status: 'Allocated',
      serialNumber: 'DL-5440-001',
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
      history: [{ action: 'Allocated', note: 'Assigned to Priya Shah', by: users[1]._id }],
    },
    {
      assetId: 'AF-002',
      name: 'Epson Projector',
      category: categories[1]._id,
      department: departments[1]._id,
      location: 'Conference Room A',
      status: 'Available',
      serialNumber: 'EP-1122',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
      history: [{ action: 'Created', note: 'Initial stock', by: users[0]._id }],
    },
    {
      assetId: 'AF-003',
      name: 'Ergonomic Chair',
      category: categories[2]._id,
      department: departments[1]._id,
      location: 'Warehouse',
      status: 'Under Maintenance',
      serialNumber: 'CHR-7788',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
      history: [{ action: 'Maintenance', note: 'Needs repair', by: users[1]._id }],
    },
  ]);

  const allocations = await Allocation.create([
    {
      asset: assets[0]._id,
      allocatedTo: users[2]._id,
      allocatedBy: users[1]._id,
      department: departments[0]._id,
      type: 'Employee',
      remarks: 'Engineering assignment',
    },
  ]);

  await Booking.create([
    {
      resourceName: 'Conference Room A',
      resourceType: 'Meeting Room',
      bookedBy: users[2]._id,
      department: departments[0]._id,
      startTime: new Date(Date.now() + 3600 * 1000),
      endTime: new Date(Date.now() + 7200 * 1000),
      purpose: 'Sprint planning',
    },
  ]);

  await MaintenanceRequest.create([
    {
      asset: assets[2]._id,
      requestedBy: users[3]._id,
      approvedBy: users[1]._id,
      title: 'Chair wheel replacement',
      description: 'Wheel is damaged',
      priority: 'High',
      status: 'In Progress',
    },
  ]);

  await AuditCycle.create([
    {
      title: 'Q3 Asset Audit',
      department: departments[0]._id,
      auditors: [users[0]._id, users[1]._id],
      items: [
        { asset: assets[0]._id, expectedLocation: 'HQ - Floor 2', verificationStatus: 'Verified' },
        { asset: assets[1]._id, expectedLocation: 'Conference Room A', verificationStatus: 'Missing' },
      ],
      discrepancyCount: 1,
      status: 'Completed',
    },
  ]);

  await Notification.create([
    {
      user: users[2]._id,
      title: 'Asset allocated',
      message: 'Dell Latitude 5440 has been allocated to your account',
      type: 'success',
      entityId: assets[0]._id.toString(),
    },
    {
      user: users[1]._id,
      title: 'Maintenance approved',
      message: 'Chair wheel replacement approved',
      type: 'warning',
      entityId: assets[2]._id.toString(),
    },
  ]);

  await Activity.create([
    { title: 'Seed data loaded', detail: 'Demo data prepared', type: 'auth', user: users[0]._id },
    { title: 'Asset allocated', detail: `${assets[0].assetId} assigned`, type: 'allocation', user: users[1]._id },
    { title: 'Booking created', detail: 'Conference Room A booked', type: 'booking', user: users[2]._id },
  ]);

  console.log(`Seed complete: ${departments.length} departments, ${categories.length} categories, ${assets.length} assets, ${allocations.length} allocations`);
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
# AssetFlow

**Enterprise Asset & Resource Management System** — built for the hackathon using the MERN stack.

AssetFlow simplifies and digitizes how organizations track, allocate, and maintain physical assets and shared resources through a centralized ERP platform. It is not tied to any single industry — any organization with equipment, furniture, vehicles, or shared spaces (offices, schools, hospitals, factories, agencies) can use it.

The platform replaces manual tracking (spreadsheets, paper logs) with structured asset lifecycles, centralized resource booking, and real-time visibility into who holds what, where it is, and its condition — with clean architecture, role-based workflows, and scalable module design. It deliberately does not touch purchasing, invoicing, or accounting.

---

## Problem Statement

Organizations routinely lose track of who holds which asset, whether shared resources are double-booked, whether maintenance requests are actually approved before work starts, and whether periodic audits ever happened. AssetFlow solves this by providing:

- A single source of truth for departments, asset categories, and the employee directory
- A flexible asset lifecycle with explicit states and controlled transitions
- Conflict-safe allocation (no asset held by two people at once) and conflict-safe resource booking (no overlapping time slots)
- An approval-gated maintenance workflow
- Structured, auditable audit cycles with auto-generated discrepancy reports
- Real-time notifications and a KPI dashboard surfacing overdue returns, bookings, and maintenance

The system enforces realistic, non-self-elevating account creation — every signup is an Employee account; roles (Department Head, Asset Manager) are only ever assigned by an Admin from the Employee Directory.

---

## Stack

- **Frontend:** React + Vite, Tailwind CSS, TanStack Query (React Query)
- **Backend:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT authentication

---

## Core Modules & Features

### 1. Login / Signup
- Signup creates an **Employee** account only — no role selection at signup
- Admin promotes Employees to Department Head or Asset Manager from the Employee Directory (the only place roles are assigned)
- Email & password login, forgot password, session validation

### 2. Dashboard
- KPI cards: Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns
- Overdue returns (past Expected Return Date) highlighted separately from upcoming ones
- Quick actions: Register Asset, Book Resource, Raise Maintenance Request
- Recent activity feed

### 3. Organization Setup *(Admin only)*
- **Department Management:** create/edit/deactivate departments, assign Department Head, optional parent department (hierarchy), Active/Inactive status
- **Asset Category Management:** create/edit categories (Electronics, Furniture, Vehicles, etc.) with optional category-specific fields (e.g. warranty period)
- **Employee Directory:** name, email, department, role, status — and the only place an Employee is promoted to Department Head or Asset Manager

### 4. Asset Registration & Directory
- Register assets: name, category, auto-generated Asset Tag (e.g. `AF-0001`), serial number, acquisition date, acquisition cost (reporting only, not linked to accounting), condition, location, photos/documents, shared/bookable flag
- Search/filter by tag, serial number, QR code, category, status, department, or location
- Lifecycle status per asset: **Available → Allocated → Reserved → Under Maintenance → Lost → Retired → Disposed** (with controlled transitions, e.g. Available ↔ Under Maintenance, Allocated → Available)
- Per-asset history: allocation history + maintenance history

### 5. Asset Allocation & Transfer
- Allocate an asset to an employee or department with an optional Expected Return Date
- **Conflict rule:** an already-allocated asset cannot be allocated again — the system shows who currently holds it and offers a Transfer Request instead
- Transfer workflow: **Requested → Approved (Asset Manager/Department Head) → Re-allocated**, with history updated automatically
- Return flow: mark returned, capture condition check-in notes, asset status reverts to Available
- Overdue allocations (past Expected Return Date) are auto-flagged and feed the Dashboard and Notifications

### 6. Resource Booking
- Calendar view of a resource's existing bookings
- **Overlap validation:** two bookings for the same resource cannot overlap in time
- Booking status: Upcoming, Ongoing, Completed, Cancelled
- Cancel/reschedule, with reminder notifications before a slot starts

### 7. Maintenance Management
- Raise a request: asset, issue description, priority, photo attachment
- Workflow: **Pending → Approved / Rejected (Asset Manager) → Technician Assigned → In Progress → Resolved**
- Asset status auto-updates to Under Maintenance on approval and back to Available on resolution
- Maintenance history retained per asset

### 8. Asset Audit
- Create an Audit Cycle (scope: department/location, date range) and assign one or more auditors
- Auditors mark each asset **Verified / Missing / Damaged**, with remarks and photo evidence
- System auto-generates a discrepancy report for flagged items
- Closing a cycle locks it and updates affected asset statuses (e.g. Missing → Lost)
- Audit history retained per cycle; role-based visibility for Admin, Asset Manager, and assigned Auditors

### 9. Reports & Analytics
- Asset utilization trends — most-used vs. idle assets
- Maintenance frequency by asset/category
- Assets due for maintenance or nearing retirement
- Department-wise allocation summary
- Resource booking heatmap (peak usage windows)
- Exportable reports

### 10. Activity Logs & Notifications
- Notifications for: Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert, Audit Discrepancy Flagged
- Full audit log of admin/manager/employee actions — who did what, when

---

## User Roles

| Role | Responsibilities |
|---|---|
| **Admin** | Manages departments, asset categories, audit cycles, and employee/role assignment (Organization Setup). Views organization-wide analytics. |
| **Asset Manager** | Registers and allocates assets. Approves transfers, maintenance requests, and audit discrepancy resolution. Approves asset returns and condition check-in notes. |
| **Department Head** | Views assets allocated to their department. Approves allocation/transfer requests within their department. Books shared resources on behalf of the department. |
| **Employee** | Views assets allocated to them. Books shared resources. Raises maintenance requests. Initiates return/transfer requests. |

---

## Basic Workflow

1. Admin sets up departments, asset categories, and promotes select employees to Department Head / Asset Manager.
2. Asset Manager registers a new asset, which enters the system as **Available**.
3. The asset is allocated to an employee/department (blocked if already allocated — a Transfer Request is required instead) or marked as a shared bookable resource.
4. Employees book shared resources by time slot; overlapping requests are rejected automatically.
5. If an asset needs repair, the holder raises a maintenance request, which must be approved before work begins and before the asset flips to Under Maintenance.
6. Assets are transferred or returned as needs change; overdue returns are flagged automatically.
7. Periodic audit cycles assign auditors, verify assets, and auto-generate discrepancy reports before closing.
8. All activity is tracked through notifications, logs, and reports.

---

## Getting Started

### Prerequisites
- Node.js (LTS)
- A running MongoDB instance (local or Atlas)

### Install
From the repo root:
```bash
npm install
```

### Environment
Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/assetflow
JWT_SECRET=assetflow_secret
CLIENT_URL=http://localhost:5173
```

### Seed data
Once MongoDB is running:
```bash
npm run seed
```
Populates sample departments, categories, employees, assets, and other reference data so the app is usable immediately.

### Run

Start both backend and frontend together from the root:
```bash
npm run dev
```

Or run them separately:
```bash
npm run dev:server   # backend only
npm run dev:client   # frontend only
```

The frontend runs at `http://localhost:5173` and the backend API at `http://localhost:5000`.

---

## Design Reference

Mockup / POC: [Excalidraw board](https://app.excalidraw.com/l/65VNwvy7c4X/5ceOBMjbDby)

---

## Project Scope Note

AssetFlow deliberately focuses on core ERP functionality — asset lifecycle, allocation, booking, maintenance approval, and auditing — with clean, reusable module design. Purchasing, invoicing, and accounting are explicitly out of scope; acquisition cost is stored for reporting/ranking purposes only.
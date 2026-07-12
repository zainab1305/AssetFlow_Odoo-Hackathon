# AssetFlow

Enterprise Asset & Resource Management System built for the hackathon using the MERN stack.

## Stack
- React + Vite
- Node.js + Express.js
- MongoDB + Mongoose
- Tailwind CSS
- JWT authentication

## Features
- Login and signup with role-based access
- KPI dashboard and recent activity feed
- Department, category, employee, asset, allocation, booking, maintenance, audit, report, and notification modules
- Sample data seed script

## Run
1. Install dependencies from the repo root: `npm install`
2. Create `server/.env`
3. Start both backend and frontend together: `npm run dev`

Alternatively, start them separately from the root:
- Backend only: `npm run dev:server`
- Frontend only: `npm run dev:client`

## Environment
Create `server/.env` with:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/assetflow
JWT_SECRET=assetflow_secret
CLIENT_URL=http://localhost:5173
```

## Seed data
Run `npm run seed` after MongoDB is available.

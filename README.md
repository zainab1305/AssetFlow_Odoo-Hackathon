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
1. Install dependencies: `npm install`
2. Set `server/.env`
3. Start backend: `npm run dev:server`
4. Start frontend: `npm run dev:client`

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

# Intelligent Water Sprinkler System (IWSS) - Setup Guide

## Quick Start Overview

This project has been simplified to two deployment options:
1. **Local Development** - Run on your computer with `npm run dev`
2. **Production** - Deploy with Docker using `docker-compose up`

---

## Local Development Setup

### Requirements
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** locally installed or running as a service
- Terminal/Command Prompt

### Step 1: Start MongoDB and Mosquitto broker

**Using Docker Compose (Recommended):**
Ensure you have Docker Desktop running, then:
```bash
# Navigate to project root
docker-compose up -d
```
This starts both MongoDB and the Mosquitto MQTT broker in the background.

**Verify services are running:**
```bash
docker-compose ps
```

- **MongoDB** will be available at: `mongodb://admin:Admin@7998@localhost:27017/iwssdb?authSource=admin`
- **MQTT Broker** will be available at: `mqtt://localhost:1883`

### Step 2: Install and Run Backend

```bash
# Navigate to backend directory
cd iwss

# Install dependencies
npm install

# Start development server (auto-reloads on changes)
npm run dev
```

✅ Backend runs on `http://localhost:3001`

### Step 3: Install and Run Frontend

In a new terminal:
```bash
# Navigate to frontend directory
cd iwss-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend runs on `http://localhost:5173` (Vite default)

### Testing the Setup

1. Open browser to `http://localhost:5173`
2. Backend API is available at `http://localhost:3001`
3. Generate test data: `curl http://localhost:3001/generate-mock-data`
4. View health: `curl http://localhost:3001/health`

---

## Production Deployment with Docker

### Requirements
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/products/docker-desktop))

### Step 1: Build and Start Services

```bash
# Navigate to project root
cd path/to/Intelligent\ Water\ Sprinkler\ System/Software/latest

# Build and run all services
docker-compose up --build
```

### Step 2: Access the Application

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:3001`
- **MongoDB:** `localhost:27017` (internal to Docker network)

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove data (warning: deletes database)
docker-compose down -v

# Rebuild without cache
docker-compose up --build --no-cache
```

---

## Key Endpoints

### Health Check
```
GET /health
```

### Generate Mock Data (Development)
```
POST /generate-mock-data
```

### Register Device
```
POST /register
Content-Type: application/json

{
  "deviceId": "sensor-001",
  "clusterId": "cluster-1",
  "location": "Farm A - Field 1"
}
```

### Get Cluster Data
```
GET /cluster/:clusterId/get-data?page=1&limit=50
```

### Get Devices in Cluster
```
GET /cluster/:clusterId/get-devices
```

### Manage Thresholds
```
GET /cluster/:clusterId/thresholds
POST /cluster/:clusterId/thresholds
Content-Type: application/json

{
  "sensor": "temperature",
  "min": 15,
  "max": 35
}
```

---

## Environment Variables

### Backend (.env)
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/iwss
```

### Frontend (.env.development)
```
VITE_API_URL=http://localhost:3001/
```

### Frontend Production (.env.production)
```
VITE_API_URL=http://backend:3001/
```

---

## Troubleshooting

### Backend won't start
- **Check MongoDB:** Ensure MongoDB is running
- **Check port:** Port 3001 might be in use. Check with: `netstat -ano | findstr :3001`
- **Clear node_modules:** Delete `iwss/node_modules` and run `npm install` again

### Frontend can't connect to backend
- **Check backend is running:** Visit `http://localhost:3001/health`
- **Check CORS:** Backend allows all origins (CORS enabled)
- **Check port:** Frontend looks for API at `http://localhost:3001/`

### Docker services won't start
- **Check ports:** 3001, 3000, 27017 must be available
- **More logs:** Run `docker-compose logs` to see detailed error messages
- **Rebuild:** Try `docker-compose down` then `docker-compose up --build`

### MongoDB connection issues
- **Local dev:** Make sure MongoDB service is running (`services.msc` on Windows)
- **Docker:** MongoDB container needs time to start. Check: `docker-compose logs mongodb`

---

## File Structure

```
iwss/                         # Backend Express.js API
├── index.js                  # Main server file
├── package.json              # Dependencies
├── .env                       # Environment variables (local)
├── .env.example              # Template for new setups
├── Dockerfile                # Production Docker image
└── docker-compose.yml        # Production orchestration

iwss-frontend/                # React + Vite Frontend
├── src/                       # React components
├── package.json              # Dependencies
├── .env.development          # Local development config
├── .env.production           # Production config
└── Dockerfile                # Production Frontend build

docker-compose.yml            # Production: backend + mongodb
```

---

## Common Tasks

### Run Backend Tests
```bash
cd iwss
npm test
```

### Add New Dependencies
```bash
# Backend
cd iwss
npm install package-name

# Frontend
cd iwss-frontend
npm install package-name
```

### Reset Database
```bash
# Delete MongoDB container and volume
docker-compose down -v

# Recreate
docker-compose up
```

### View Backend Logs (Docker)
```bash
docker-compose logs -f backend
```

---

## Next Steps

1. ✅ Local development: `npm run dev` (backend) + `npm run dev` (frontend)
2. ✅ Production deployment: `docker-compose up --build`
3. 📝 Add custom logic to endpoints in `iwss/index.js`
4. 🎨 Customize frontend components in `iwss-frontend/src/`

---

## Support

For issues or questions:
1. Check the **Troubleshooting** section above
2. Review logs: `docker-compose logs` or console output
3. Verify MongoDB connection: `curl http://localhost:3001/health`


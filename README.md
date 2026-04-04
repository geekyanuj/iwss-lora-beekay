# Intelligent Water Sprinkler System

An IoT-based intelligent water sprinkler system that monitors air quality and automatically controls irrigation devices based on environmental conditions.

## 🎯 Overview

This system consists of:
- **Backend API**: Node.js/Express server managing MQTT communication and data storage
- **Frontend Dashboard**: React/TypeScript interface for monitoring and control
- **IoT Infrastructure**: MQTT broker and MongoDB database for reliable message handling and storage

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Development (Recommended)

```bash
# Clone and navigate to project
cd iwss

# Start all services with development configuration
docker-compose --env-file .env.docker.dev up --build

# Access:
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

### Production Deployment

```bash
# Configure production environment
cp iwss/.env.example iwss/.env
# Edit .env with your production credentials

# Deploy
docker-compose --env-file iwss/.env up -d --build
```

> **Full deployment guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📁 Project Structure

```
.
├── iwss/                   # Backend API Server
│   ├── index.js                   # Main application
│   ├── package.json               # Dependencies
│   ├── docker-compose.yml         # Service orchestration
│   ├── Dockerfile                 # Container definition
│   ├── .env.development           # Dev environment variables
│   ├── .env.production            # Prod environment variables
│   ├── ecosystem.config.json      # PM2 configuration
│   └── config/                    # Service configurations
│
├── iwss-frontend/          # React Frontend
│   ├── src/
│   │   ├── services.ts            # API client
│   │   ├── pages/                 # Route pages
│   │   ├── component/             # React components
│   │   └── assets/                # Static assets
│   ├── package.json               # Dependencies
│   ├── Dockerfile                 # Container definition
│   ├── vite.config.ts             # Build configuration
│   ├── .env.development           # Dev environment variables
│   └── .env.production            # Prod environment variables
│
└── DEPLOYMENT.md                  # Detailed deployment guide
```

## 🔧 Configuration

### Environment Variables

The project uses environment files for configuration management:

**Backend Variables** (iwss/.env.*)
```
NODE_ENV                 # development | production
MQTT_HOST               # MQTT broker hostname
MQTT_PORT               # MQTT broker port
MQTT_USERNAME           # MQTT authentication
MQTT_PASSWORD           # MQTT authentication
MONGODB_URI             # Database connection string
SERVER_PORT             # API server port (default: 3000)
CORS_ORIGIN            # CORS allowed origins
```

**Frontend Variables** (iwss-frontend/.env.*)
```
VITE_API_URL            # Backend API endpoint
VITE_ENVIRONMENT        # development | production
VITE_LOG_LEVEL          # debug | error
```

### Environment Files

- `.env.development` - Local development configuration
- `.env.production` - Production deployment configuration
- `.env.docker.dev` - Docker development configuration
- `.env.docker.prod` - Docker production configuration
- `.env.example` - Template for creating new configuration

## 📊 Services

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3001 | React dashboard |
| Backend API | 3000 | REST API server |
| MQTT Broker | 1883/1884 | IoT communication |
| MongoDB | 27017 | Data storage |

## 🔌 API Endpoints

### Threshold Management
- `GET /cluster/:clusterId/thresholds` - Retrieve threshold settings
- `POST /cluster/:clusterId/update-threshold` - Update thresholds

### Device Operations
- `POST /register` - Register new device
- `GET /cluster/:clusterId/get-devices` - List cluster devices
- `POST /send-command` - Send on/off command

### Data Access
- `GET /cluster/:clusterId/get-data` - Retrieve telemetry data
- `GET /cluster/:clusterId/analytics` - Get analytics data
- `GET /cluster/:clusterId/home-page-data` - Dashboard data

## 🛠️ Development

### Backend Development

```bash
cd iwss

# Install dependencies
npm install

# Run in development
NODE_ENV=development npm run dev

# Run in production
NODE_ENV=production npm run prod
```

### Frontend Development

```bash
cd iwss-frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build:prod
```

## 🐳 Docker Deployment

### Build Images
```bash
# Automatic build with docker-compose
docker-compose --env-file .env.docker.dev up --build
```

### Manage Services
```bash
# Start services
docker-compose -f docker-compose.yml -d up

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## 📈 Monitoring

### Docker Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f frontend
```

### Database Status
```bash
# Check MongoDB connection
docker-compose exec mongodb mongosh -u admin -p
```

## 🔒 Security Notes

⚠️ **Before Production:**
1. Change default credentials in environment files
2. Use strong database passwords
3. Restrict CORS origins to specific domains
4. Implement proper API authentication
5. Use HTTPS in production
6. Never commit .env files with production credentials

## 📝 Key Features

- **Real-time Monitoring**: Dashboard shows live device status and sensor readings
- **Automatic Control**: Sprinklers activate/deactivate based on PM2.5/PM10 thresholds
- **Historical Analytics**: Track device performance and water usage patterns
- **Multi-cluster Support**: Manage multiple irrigation zones independently
- **MQTT Integration**: Efficient IoT device communication
- **MongoDB Storage**: Reliable data persistence

## 🚦 Status Indicators

- **Green (Running)**: Device active and communicating
- **Red (Stopped)**: Device offline or idle
- **Yellow (Warning)**: High threshold values detected

## 📞 Troubleshooting

### Services Won't Start
```bash
# Check port availability
lsof -i :3000  # Backend
lsof -i :3001  # Frontend
lsof -i :1883  # MQTT
lsof -i :27017 # MongoDB
```

### Database Connection Error
- Verify MongoDB is running: `docker-compose ps`
- Check credentials in .env file
- Ensure MONGODB_URI format is correct

### API Not Responding
- Check backend logs: `docker-compose logs server`
- Verify VITE_API_URL in frontend matches backend endpoint
- Ensure proper network configuration

> For detailed troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📚 Additional Resources

- [Deployment Guide](./DEPLOYMENT.md) - Comprehensive deployment instructions
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MQTT Protocol](https://mqtt.org/)
- [MongoDB Documentation](https://docs.mongodb.com/)

## 📄 License

ISC

## 👤 Author

Intelligent Water Sprinkler System Team

---

**Last Updated**: March 2026
**Version**: 1.0.0

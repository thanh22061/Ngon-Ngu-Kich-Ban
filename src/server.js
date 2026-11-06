const app = require('./app');
const { PORT, NODE_ENV } = require('./config/environment');
const prisma = require('./config/db');

async function startServer() {
  try {
    // Test SQL Server database connection
    await prisma.$connect();
    console.log('✅ Connected to Microsoft SQL Server via Prisma successfully!');

    app.listen(PORT, () => {
      console.log(`🚀 SportZone Backend Server is running in [${NODE_ENV}] mode on port ${PORT}`);
      console.log(`🌐 Frontend Web UI:  http://localhost:${PORT}`);
      console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
      console.log(`📚 API Base URL:     http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ SQL Server connection warning:', error.message);
    app.listen(PORT, () => {
      console.warn(`⚠️ Server listening on port ${PORT} (SQL Server pending connection: ${error.message})`);
      console.log(`🌐 Frontend Web UI:  http://localhost:${PORT}`);
    });
  }
}

startServer();

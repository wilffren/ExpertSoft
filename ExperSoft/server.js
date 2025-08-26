// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Create necessary directories
const createDirectories = () => {
    const dirs = ['uploads', 'logs'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            console.log(`📁 Created directory: ${dir}`);
        }
    });
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Static files for uploaded CSVs
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Fintech Data Manager API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            customers: {
                create: 'POST /api/customers',
                getAll: 'GET /api/customers',
                getById: 'GET /api/customers/:id',
                update: 'PUT /api/customers/:id',
                delete: 'DELETE /api/customers/:id',
                search: 'GET /api/customers/search?q=searchTerm'
            },
            queries: {
                totalPaidByCustomer: 'GET /api/queries/total-paid-by-customer',
                pendingInvoices: 'GET /api/queries/pending-invoices',
                transactionsByPlatform: 'GET /api/queries/transactions-by-platform/:platform',
                platforms: 'GET /api/queries/platforms',
                dashboardSummary: 'GET /api/queries/dashboard-summary'
            },
            csvUpload: 'POST /api/upload-csv'
        },
        documentation: 'Check the Postman collection for detailed API documentation'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🔄 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

// Start server
const startServer = async () => {
    try {
        // Create necessary directories
        createDirectories();
        
        // Test database connection
        console.log('🔄 Testing database connection...');
        const isConnected = await testConnection();
        
        if (!isConnected) {
            console.error('❌ Failed to connect to database. Please check your configuration.');
            process.exit(1);
        }
        
        // Start the server
        const server = app.listen(PORT, () => {
            console.log('🚀 ================================');
            console.log(`🎉 Server running on port ${PORT}`);
            console.log(`📡 API URL: http://localhost:${PORT}`);
            console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📚 API docs: http://localhost:${PORT}/`);
            console.log('🚀 ================================');
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
            } else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });

        return server;
        
    } catch (error) {
        console.error('💥 Failed to start server:', error);
        process.exit(1);
    }
};

// Only start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;
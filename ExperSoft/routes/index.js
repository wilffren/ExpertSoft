// routes/index.js
const express = require('express');
const CustomerController = require('../controllers/customerController');
const QueryController = require('../controllers/queryController');
const CSVLoader = require('../scripts/csvLoader');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, 'data-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed!'), false);
        }
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running successfully',
        timestamp: new Date().toISOString()
    });
});

// Customer CRUD routes
router.post('/customers', CustomerController.create);
router.get('/customers', CustomerController.getAll);
router.get('/customers/search', CustomerController.search);
router.get('/customers/:id', CustomerController.getById);
router.put('/customers/:id', CustomerController.update);
router.delete('/customers/:id', CustomerController.delete);

// Advanced query routes
router.get('/queries/total-paid-by-customer', QueryController.getTotalPaidByCustomer);
router.get('/queries/pending-invoices', QueryController.getPendingInvoices);
router.get('/queries/transactions-by-platform/:platform', QueryController.getTransactionsByPlatform);
router.get('/queries/platforms', QueryController.getPlatforms);
router.get('/queries/dashboard-summary', QueryController.getDashboardSummary);

// CSV upload and processing route (bonus points)
router.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        console.log(`📁 Processing uploaded file: ${req.file.filename}`);
        
        const loader = new CSVLoader();
        await loader.execute(req.file.path);
        
        res.json({
            success: true,
            message: 'CSV file processed successfully',
            filename: req.file.filename,
            uploadedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error processing CSV:', error);
        res.status(500).json({
            success: false,
            message: `Error processing CSV file: ${error.message}`
        });
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: `File upload error: ${error.message}`
        });
    }
    
    res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
    });
});

module.exports = router;
// controllers/customerController.js
const Customer = require('../models/Customer');
const { validateCustomer } = require('../validators/customerValidator');

class CustomerController {
    
    // Create new customer
    static async create(req, res) {
        try {
            const { error, value } = validateCustomer(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }

            const customer = await Customer.create(value);
            
            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                data: customer
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get all customers
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;

            const customers = await Customer.findAll(limit, offset);
            const total = await Customer.count();
            
            res.json({
                success: true,
                data: customers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get customer by ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const customer = await Customer.findById(id);
            
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }
            
            res.json({
                success: true,
                data: customer
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Update customer
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { error, value } = validateCustomer(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }

            const customer = await Customer.update(id, value);
            
            res.json({
                success: true,
                message: 'Customer updated successfully',
                data: customer
            });
            
        } catch (error) {
            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Delete customer
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await Customer.delete(id);
            
            res.json({
                success: true,
                message: result.message
            });
            
        } catch (error) {
            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Search customers
    static async search(req, res) {
        try {
            const { q } = req.query;
            
            if (!q || q.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const customers = await Customer.search(q.trim());
            
            res.json({
                success: true,
                data: customers,
                count: customers.length
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = CustomerController;
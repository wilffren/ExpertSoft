// models/Customer.js
const { pool } = require('../config/database');

class Customer {
    
    // Create a new customer
    static async create(customerData) {
        const { name_customer, identification_number, address, phone, email, id_invoice_int } = customerData;
        
        const query = `
            INSERT INTO customers (name_customer, identification_number, address, phone, email, id_invoice_int)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        try {
            const [result] = await pool.execute(query, [
                name_customer, identification_number, address, phone, email, id_invoice_int || null
            ]);
            return { id: result.insertId, ...customerData };
        } catch (error) {
            throw new Error(`Error creating customer: ${error.message}`);
        }
    }

    // Get all customers
    static async findAll(limit = 50, offset = 0) {
        const query = `
            SELECT 
                c.*,
                i.number_invoice,
                i.invoice_period,
                i.invoiced_amount,
                i.amount_paid
            FROM customers c
            LEFT JOIN invoices i ON c.id_invoice_int = i.id_invoice_int
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        try {
            const [rows] = await pool.execute(query, [limit, offset]);
            return rows;
        } catch (error) {
            throw new Error(`Error fetching customers: ${error.message}`);
        }
    }

    // Get customer by ID
    static async findById(id) {
        const query = `
            SELECT 
                c.*,
                i.number_invoice,
                i.invoice_period,
                i.invoiced_amount,
                i.amount_paid
            FROM customers c
            LEFT JOIN invoices i ON c.id_invoice_int = i.id_invoice_int
            WHERE c.id_customer_int = ?
        `;
        
        try {
            const [rows] = await pool.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            throw new Error(`Error fetching customer: ${error.message}`);
        }
    }

    // Update customer
    static async update(id, customerData) {
        const { name_customer, identification_number, address, phone, email, id_invoice_int } = customerData;
        
        const query = `
            UPDATE customers 
            SET name_customer = ?, identification_number = ?, address = ?, phone = ?, email = ?, id_invoice_int = ?
            WHERE id_customer_int = ?
        `;
        
        try {
            const [result] = await pool.execute(query, [
                name_customer, identification_number, address, phone, email, id_invoice_int || null, id
            ]);
            
            if (result.affectedRows === 0) {
                throw new Error('Customer not found');
            }
            
            return await this.findById(id);
        } catch (error) {
            throw new Error(`Error updating customer: ${error.message}`);
        }
    }

    // Delete customer
    static async delete(id) {
        const query = 'DELETE FROM customers WHERE id_customer_int = ?';
        
        try {
            const [result] = await pool.execute(query, [id]);
            
            if (result.affectedRows === 0) {
                throw new Error('Customer not found');
            }
            
            return { message: 'Customer deleted successfully' };
        } catch (error) {
            throw new Error(`Error deleting customer: ${error.message}`);
        }
    }

    // Get customer count
    static async count() {
        const query = 'SELECT COUNT(*) as total FROM customers';
        
        try {
            const [rows] = await pool.execute(query);
            return rows[0].total;
        } catch (error) {
            throw new Error(`Error counting customers: ${error.message}`);
        }
    }

    // Search customers by name or identification
    static async search(searchTerm) {
        const query = `
            SELECT 
                c.*,
                i.number_invoice,
                i.invoice_period,
                i.invoiced_amount,
                i.amount_paid
            FROM customers c
            LEFT JOIN invoices i ON c.id_invoice_int = i.id_invoice_int
            WHERE c.name_customer LIKE ? OR c.identification_number LIKE ?
            ORDER BY c.name_customer
        `;
        
        try {
            const searchPattern = `%${searchTerm}%`;
            const [rows] = await pool.execute(query, [searchPattern, searchPattern]);
            return rows;
        } catch (error) {
            throw new Error(`Error searching customers: ${error.message}`);
        }
    }
}

module.exports = Customer;
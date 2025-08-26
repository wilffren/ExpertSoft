// controllers/queryController.js
const { pool } = require('../config/database');

class QueryController {
    
    // Query 1: Total paid by each customer
    static async getTotalPaidByCustomer(req, res) {
        try {
            const query = `
                SELECT 
                    c.id_customer_int,
                    c.name_customer,
                    c.identification_number,
                    c.email,
                    COALESCE(SUM(t.amount_transaction), 0) as total_paid,
                    COUNT(t.id_transaction_int) as total_transactions
                FROM customers c
                LEFT JOIN invoices i ON c.id_invoice_int = i.id_invoice_int
                LEFT JOIN transactions t ON i.id_transaction_int = t.id_transaction_int
                WHERE t.id_state_int = (SELECT id_state_int FROM states WHERE state_transaction = 'Completada')
                   OR t.id_transaction_int IS NULL
                GROUP BY c.id_customer_int, c.name_customer, c.identification_number, c.email
                ORDER BY total_paid DESC
            `;
            
            const [rows] = await pool.execute(query);
            
            res.json({
                success: true,
                message: 'Total paid by each customer retrieved successfully',
                data: rows,
                count: rows.length
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Error retrieving total paid by customer: ${error.message}`
            });
        }
    }

    // Query 2: Pending invoices with customer and transaction information
    static async getPendingInvoices(req, res) {
        try {
            const query = `
                SELECT 
                    i.id_invoice_int,
                    i.number_invoice,
                    i.invoice_period,
                    i.invoiced_amount,
                    i.amount_paid,
                    (i.invoiced_amount - COALESCE(i.amount_paid, 0)) as pending_amount,
                    c.id_customer_int,
                    c.name_customer,
                    c.identification_number,
                    c.email,
                    c.phone,
                    t.id_transaction_int,
                    t.id_of_transaction,
                    t.date_time as transaction_date,
                    t.amount_transaction,
                    t.type_transaction,
                    s.state_transaction,
                    GROUP_CONCAT(p.name_platform SEPARATOR ', ') as platforms
                FROM invoices i
                LEFT JOIN customers c ON i.id_invoice_int = c.id_invoice_int
                LEFT JOIN transactions t ON i.id_transaction_int = t.id_transaction_int
                LEFT JOIN states s ON t.id_state_int = s.id_state_int
                LEFT JOIN transaction_platforms tp ON t.id_transaction_int = tp.id_transaction_int
                LEFT JOIN platforms p ON tp.id_platform_int = p.id_platform_int
                WHERE i.invoiced_amount > COALESCE(i.amount_paid, 0)
                GROUP BY i.id_invoice_int, i.number_invoice, i.invoice_period, i.invoiced_amount, 
                         i.amount_paid, c.id_customer_int, c.name_customer, c.identification_number, 
                         c.email, c.phone, t.id_transaction_int, t.id_of_transaction, 
                         t.date_time, t.amount_transaction, t.type_transaction, s.state_transaction
                ORDER BY i.invoice_period DESC, pending_amount DESC
            `;
            
            const [rows] = await pool.execute(query);
            
            res.json({
                success: true,
                message: 'Pending invoices with customer and transaction information retrieved successfully',
                data: rows,
                count: rows.length
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Error retrieving pending invoices: ${error.message}`
            });
        }
    }

    // Query 3: Transactions by platform
    static async getTransactionsByPlatform(req, res) {
        try {
            const { platform } = req.params;
            
            if (!platform) {
                return res.status(400).json({
                    success: false,
                    message: 'Platform parameter is required'
                });
            }
            
            const query = `
                SELECT 
                    t.id_transaction_int,
                    t.id_of_transaction,
                    t.date_time,
                    t.amount_transaction,
                    t.type_transaction,
                    s.state_transaction,
                    p.name_platform,
                    c.id_customer_int,
                    c.name_customer,
                    c.identification_number,
                    c.email,
                    i.id_invoice_int,
                    i.number_invoice,
                    i.invoice_period,
                    i.invoiced_amount,
                    i.amount_paid
                FROM transactions t
                INNER JOIN transaction_platforms tp ON t.id_transaction_int = tp.id_transaction_int
                INNER JOIN platforms p ON tp.id_platform_int = p.id_platform_int
                INNER JOIN states s ON t.id_state_int = s.id_state_int
                LEFT JOIN invoices i ON t.id_transaction_int = i.id_transaction_int
                LEFT JOIN customers c ON i.id_invoice_int = c.id_invoice_int
                WHERE p.name_platform = ?
                ORDER BY t.date_time DESC
            `;
            
            const [rows] = await pool.execute(query, [platform]);
            
            // Get platform statistics
            const statsQuery = `
                SELECT 
                    p.name_platform,
                    COUNT(t.id_transaction_int) as total_transactions,
                    SUM(t.amount_transaction) as total_amount,
                    AVG(t.amount_transaction) as average_amount,
                    SUM(CASE WHEN s.state_transaction = 'Completada' THEN 1 ELSE 0 END) as completed_transactions,
                    SUM(CASE WHEN s.state_transaction = 'Pendiente' THEN 1 ELSE 0 END) as pending_transactions,
                    SUM(CASE WHEN s.state_transaction = 'Fallida' THEN 1 ELSE 0 END) as failed_transactions
                FROM transactions t
                INNER JOIN transaction_platforms tp ON t.id_transaction_int = tp.id_transaction_int
                INNER JOIN platforms p ON tp.id_platform_int = p.id_platform_int
                INNER JOIN states s ON t.id_state_int = s.id_state_int
                WHERE p.name_platform = ?
                GROUP BY p.name_platform
            `;
            
            const [statsRows] = await pool.execute(statsQuery, [platform]);
            
            res.json({
                success: true,
                message: `Transactions for platform ${platform} retrieved successfully`,
                data: rows,
                statistics: statsRows[0] || null,
                count: rows.length
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Error retrieving transactions by platform: ${error.message}`
            });
        }
    }

    // Get all available platforms
    static async getPlatforms(req, res) {
        try {
            const query = 'SELECT * FROM platforms ORDER BY name_platform';
            const [rows] = await pool.execute(query);
            
            res.json({
                success: true,
                message: 'Platforms retrieved successfully',
                data: rows
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Error retrieving platforms: ${error.message}`
            });
        }
    }

    // Dashboard summary
    static async getDashboardSummary(req, res) {
        try {
            // Get general statistics
            const summaryQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM customers) as total_customers,
                    (SELECT COUNT(*) FROM invoices) as total_invoices,
                    (SELECT COUNT(*) FROM transactions) as total_transactions,
                    (SELECT COUNT(*) FROM platforms) as total_platforms,
                    (SELECT SUM(amount_transaction) FROM transactions t 
                     INNER JOIN states s ON t.id_state_int = s.id_state_int 
                     WHERE s.state_transaction = 'Completada') as total_completed_amount,
                    (SELECT SUM(invoiced_amount - COALESCE(amount_paid, 0)) FROM invoices 
                     WHERE invoiced_amount > COALESCE(amount_paid, 0)) as total_pending_amount
            `;
            
            const [summaryRows] = await pool.execute(summaryQuery);
            
            // Get transactions by state
            const statesQuery = `
                SELECT 
                    s.state_transaction,
                    COUNT(t.id_transaction_int) as count,
                    COALESCE(SUM(t.amount_transaction), 0) as total_amount
                FROM states s
                LEFT JOIN transactions t ON s.id_state_int = t.id_state_int
                GROUP BY s.id_state_int, s.state_transaction
                ORDER BY count DESC
            `;
            
            const [statesRows] = await pool.execute(statesQuery);
            
            // Get transactions by platform
            const platformsQuery = `
                SELECT 
                    p.name_platform,
                    COUNT(t.id_transaction_int) as count,
                    COALESCE(SUM(t.amount_transaction), 0) as total_amount
                FROM platforms p
                LEFT JOIN transaction_platforms tp ON p.id_platform_int = tp.id_platform_int
                LEFT JOIN transactions t ON tp.id_transaction_int = t.id_transaction_int
                GROUP BY p.id_platform_int, p.name_platform
                ORDER BY count DESC
            `;
            
            const [platformsRows] = await pool.execute(platformsQuery);
            
            res.json({
                success: true,
                message: 'Dashboard summary retrieved successfully',
                data: {
                    summary: summaryRows[0],
                    transactionsByState: statesRows,
                    transactionsByPlatform: platformsRows
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Error retrieving dashboard summary: ${error.message}`
            });
        }
    }
}

module.exports = QueryController;
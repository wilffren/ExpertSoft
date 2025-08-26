// scripts/csvLoader.js
const fs = require('fs');
const csv = require('csv-parser');
const { pool } = require('../config/database');
require('dotenv').config();

class CSVLoader {
    
    constructor() {
        this.transactions = [];
        this.customers = [];
        this.invoices = [];
        this.platforms = new Set();
        this.states = new Set();
    }

    // Load and parse CSV data
    async loadCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    results.push(data);
                })
                .on('end', () => {
                    console.log(`✅ CSV file loaded successfully. ${results.length} records found.`);
                    resolve(results);
                })
                .on('error', (error) => {
                    console.error('❌ Error reading CSV file:', error);
                    reject(error);
                });
        });
    }

    // Normalize and process the data
    processData(rawData) {
        console.log('📊 Processing and normalizing data...');
        
        const processedData = {
            customers: new Map(),
            invoices: new Map(),
            transactions: new Map(),
            platforms: new Set(),
            states: new Set()
        };

        rawData.forEach((row, index) => {
            try {
                // Extract customer data
                const customerId = row['Número de Identificación'] || row['identification_number'];
                if (customerId && !processedData.customers.has(customerId)) {
                    processedData.customers.set(customerId, {
                        identification_number: customerId,
                        name_customer: row['Nombre del Cliente'] || row['customer_name'] || `Customer ${customerId}`,
                        address: row['Dirección'] || row['address'] || 'N/A',
                        phone: row['Teléfono'] || row['phone'] || 'N/A',
                        email: row['Correo Electrónico'] || row['email'] || `customer${customerId}@example.com`
                    });
                }

                // Extract invoice data
                const invoiceNumber = row['Número de Factura'] || row['invoice_number'];
                if (invoiceNumber && !processedData.invoices.has(invoiceNumber)) {
                    processedData.invoices.set(invoiceNumber, {
                        number_invoice: invoiceNumber,
                        invoice_period: row['Periodo de Facturación'] || row['invoice_period'] || 'N/A',
                        invoiced_amount: parseFloat(row['Monto Facturado'] || row['invoiced_amount'] || 0),
                        amount_paid: parseFloat(row['Monto Pagado'] || row['amount_paid'] || 0),
                        customer_identification: customerId
                    });
                }

                // Extract transaction data
                const transactionId = row['ID de la Transacción'] || row['transaction_id'];
                if (transactionId && !processedData.transactions.has(transactionId)) {
                    const dateTime = this.parseDateTime(row['Fecha y Hora de la Transacción'] || row['transaction_date']);
                    const amount = parseFloat(row['Monto de la Transacción'] || row['transaction_amount'] || 0);
                    const state = row['Estado de la Transacción'] || row['transaction_state'] || 'Pendiente';
                    const platform = row['Plataforma Utilizada'] || row['platform'] || 'Unknown';

                    processedData.transactions.set(transactionId, {
                        id_of_transaction: transactionId,
                        date_time: dateTime,
                        amount_transaction: amount,
                        type_transaction: row['Tipo de Transacción'] || row['transaction_type'] || 'Pago',
                        state_transaction: state,
                        platform_name: platform,
                        invoice_number: invoiceNumber
                    });

                    processedData.states.add(state);
                    processedData.platforms.add(platform);
                }

            } catch (error) {
                console.warn(`⚠️ Warning: Error processing row ${index + 1}:`, error.message);
            }
        });

        console.log(`✅ Data processed successfully:`);
        console.log(`   - Customers: ${processedData.customers.size}`);
        console.log(`   - Invoices: ${processedData.invoices.size}`);
        console.log(`   - Transactions: ${processedData.transactions.size}`);
        console.log(`   - Platforms: ${processedData.platforms.size}`);
        console.log(`   - States: ${processedData.states.size}`);

        return processedData;
    }

    // Parse date time from various formats
    parseDateTime(dateString) {
        if (!dateString) return new Date();
        
        // Try different date formats
        const formats = [
            /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/, // YYYY-MM-DD HH:MM:SS
            /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/, // DD/MM/YYYY HH:MM:SS
            /(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/, // YYYY/MM/DD HH:MM:SS
        ];

        for (const format of formats) {
            const match = dateString.match(format);
            if (match) {
                const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
                return new Date(year, month - 1, day, hour, minute, second);
            }
        }

        // Fallback: try direct parsing
        const parsed = new Date(dateString);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    // Insert data into database
    async insertData(processedData) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            console.log('🔄 Starting database insertion...');

            // Insert states
            console.log('📝 Inserting states...');
            for (const state of processedData.states) {
                await connection.execute(
                    'INSERT IGNORE INTO states (state_transaction) VALUES (?)',
                    [state]
                );
            }

            // Insert platforms
            console.log('📝 Inserting platforms...');
            for (const platform of processedData.platforms) {
                await connection.execute(
                    'INSERT IGNORE INTO platforms (name_platform) VALUES (?)',
                    [platform]
                );
            }

            // Get state and platform IDs
            const [stateRows] = await connection.execute('SELECT id_state_int, state_transaction FROM states');
            const [platformRows] = await connection.execute('SELECT id_platform_int, name_platform FROM platforms');
            
            const stateMap = new Map(stateRows.map(row => [row.state_transaction, row.id_state_int]));
            const platformMap = new Map(platformRows.map(row => [row.name_platform, row.id_platform_int]));

            // Insert transactions
            console.log('📝 Inserting transactions...');
            const transactionMap = new Map();
            for (const transaction of processedData.transactions.values()) {
                const stateId = stateMap.get(transaction.state_transaction);
                const [result] = await connection.execute(
                    'INSERT INTO transactions (id_of_transaction, date_time, amount_transaction, type_transaction, id_state_int) VALUES (?, ?, ?, ?, ?)',
                    [
                        transaction.id_of_transaction,
                        transaction.date_time,
                        transaction.amount_transaction,
                        transaction.type_transaction,
                        stateId
                    ]
                );
                transactionMap.set(transaction.id_of_transaction, result.insertId);

                // Insert transaction-platform relationship
                const platformId = platformMap.get(transaction.platform_name);
                if (platformId) {
                    await connection.execute(
                        'INSERT INTO transaction_platforms (id_transaction_int, id_platform_int) VALUES (?, ?)',
                        [result.insertId, platformId]
                    );
                }
            }

            // Insert invoices
            console.log('📝 Inserting invoices...');
            const invoiceMap = new Map();
            for (const invoice of processedData.invoices.values()) {
                const transactionId = transactionMap.get(
                    Array.from(processedData.transactions.values())
                        .find(t => t.invoice_number === invoice.number_invoice)?.id_of_transaction
                );
                
                const [result] = await connection.execute(
                    'INSERT INTO invoices (number_invoice, invoice_period, invoiced_amount, amount_paid, id_transaction_int) VALUES (?, ?, ?, ?, ?)',
                    [
                        invoice.number_invoice,
                        invoice.invoice_period,
                        invoice.invoiced_amount,
                        invoice.amount_paid,
                        transactionId || null
                    ]
                );
                invoiceMap.set(invoice.number_invoice, result.insertId);
            }

            // Insert customers
            console.log('📝 Inserting customers...');
            for (const customer of processedData.customers.values()) {
                const customerInvoice = Array.from(processedData.invoices.values())
                    .find(inv => inv.customer_identification === customer.identification_number);
                const invoiceId = customerInvoice ? invoiceMap.get(customerInvoice.number_invoice) : null;

                await connection.execute(
                    'INSERT INTO customers (name_customer, identification_number, address, phone, email, id_invoice_int) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        customer.name_customer,
                        customer.identification_number,
                        customer.address,
                        customer.phone,
                        customer.email,
                        invoiceId
                    ]
                );
            }

            await connection.commit();
            console.log('✅ All data inserted successfully!');
            
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error inserting data:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Main execution method
    async execute(csvFilePath) {
        try {
            console.log('🚀 Starting CSV data loading process...');
            console.log(`📁 Loading file: ${csvFilePath}`);
            
            // Check if file exists
            if (!fs.existsSync(csvFilePath)) {
                throw new Error(`CSV file not found: ${csvFilePath}`);
            }

            // Load CSV data
            const rawData = await this.loadCSV(csvFilePath);
            
            // Process and normalize data
            const processedData = this.processData(rawData);
            
            // Insert into database
            await this.insertData(processedData);
            
            console.log('🎉 CSV loading process completed successfully!');
            
        } catch (error) {
            console.error('💥 CSV loading process failed:', error);
            throw error;
        }
    }
}

// CLI execution
if (require.main === module) {
    const csvFilePath = process.argv[2];
    
    if (!csvFilePath) {
        console.error('❌ Please provide the CSV file path as an argument');
        console.log('Usage: node scripts/csvLoader.js <csv-file-path>');
        process.exit(1);
    }

    const loader = new CSVLoader();
    loader.execute(csvFilePath)
        .then(() => {
            console.log('✨ Process finished successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💀 Process failed:', error);
            process.exit(1);
        });
}

module.exports = CSVLoader;
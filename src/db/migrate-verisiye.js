import { query } from './connection.js';

const migrations = [
  // Customers table for Verisiye
  `CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    house_no VARCHAR(100),
    phone VARCHAR(50),
    total_credit DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on house_no for faster filtering
  `CREATE INDEX IF NOT EXISTS idx_customers_house_no ON customers(house_no)`,

  // Create index on name for search
  `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`,

  // Verisiye (Credit) transactions table
  `CREATE TABLE IF NOT EXISTS verisiye_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on customer_id for faster lookups
  `CREATE INDEX IF NOT EXISTS idx_verisiye_customer_id ON verisiye_transactions(customer_id)`,

  // Create index on transaction_date for date filtering
  `CREATE INDEX IF NOT EXISTS idx_verisiye_date ON verisiye_transactions(transaction_date)`,

  // Create trigger for customers table
  `DROP TRIGGER IF EXISTS update_customers_updated_at ON customers`,
  `CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()`
];

async function runMigrations() {
  console.log('Starting Verisiye migrations...');

  try {
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}/${migrations.length}...`);
      await query(migrations[i]);
    }

    console.log('✓ Verisiye migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Verisiye migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

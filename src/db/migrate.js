import { query } from './connection.js';

const migrations = [
  // Products table
  `CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_buy DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_sell DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100),
    expire_date DATE,
    is_by_weight BOOLEAN DEFAULT FALSE,
    price_per_kg DECIMAL(10, 2),
    unit VARCHAR(10) DEFAULT 'piece',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on barcode for faster lookups
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,

  // Create index on name for search
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,

  // Transactions table
  `CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    total_profit DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Transaction items table
  `CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_sale DECIMAL(10, 2) NOT NULL,
    cost_at_sale DECIMAL(10, 2) NOT NULL,
    weight DECIMAL(10, 3),
    is_by_weight BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on transaction_id for faster joins
  `CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id)`,

  // Create updated_at trigger function
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ language 'plpgsql'`,

  // Create trigger for products table
  `DROP TRIGGER IF EXISTS update_products_updated_at ON products`,
  `CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()`
];

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}/${migrations.length}...`);
      await query(migrations[i]);
    }

    console.log('✓ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

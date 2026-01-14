import { query } from './connection.js';

const migrations = [
  // Expense categories master table
  `CREATE TABLE IF NOT EXISTS expense_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'kasa', 'kart', or 'devir'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on category
  `CREATE INDEX IF NOT EXISTS idx_expense_products_category ON expense_products(category)`,

  // Daily balance sheet table
  `CREATE TABLE IF NOT EXISTS daily_balance_sheets (
    id SERIAL PRIMARY KEY,
    sheet_date DATE NOT NULL UNIQUE,

    -- Sales data (from transactions table)
    kasa_sistem DECIMAL(10, 2) DEFAULT 0, -- Total sales from system

    -- Manual entries
    verisiye_total DECIMAL(10, 2) DEFAULT 0, -- Total credit given today
    kasa_nakit DECIMAL(10, 2) DEFAULT 0, -- Cash count
    k_kart DECIMAL(10, 2) DEFAULT 0, -- Card terminal amount

    -- Calculated fields
    toplam DECIMAL(10, 2) DEFAULT 0, -- kasa_nakit + k_kart + kasa_gider
    fark DECIMAL(10, 2) DEFAULT 0, -- kasa_sistem - toplam
    devir_toplam DECIMAL(10, 2) DEFAULT 0, -- yesterday_devir - devir_gider + kasa_nakit

    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on sheet_date
  `CREATE INDEX IF NOT EXISTS idx_balance_sheets_date ON daily_balance_sheets(sheet_date)`,

  // Expense items table (Kasa Gider, K.Kart Gider, Devir Gider)
  `CREATE TABLE IF NOT EXISTS balance_sheet_expenses (
    id SERIAL PRIMARY KEY,
    balance_sheet_id INTEGER NOT NULL REFERENCES daily_balance_sheets(id) ON DELETE CASCADE,
    expense_product_id INTEGER NOT NULL REFERENCES expense_products(id),
    expense_type VARCHAR(50) NOT NULL, -- 'kasa_gider', 'kart_gider', 'devir_gider'
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on balance_sheet_id
  `CREATE INDEX IF NOT EXISTS idx_expenses_sheet_id ON balance_sheet_expenses(balance_sheet_id)`,

  // Create index on expense_type
  `CREATE INDEX IF NOT EXISTS idx_expenses_type ON balance_sheet_expenses(expense_type)`,

  // Shop purchases table (products bought for the shop)
  `CREATE TABLE IF NOT EXISTS shop_purchases (
    id SERIAL PRIMARY KEY,
    balance_sheet_id INTEGER NOT NULL REFERENCES daily_balance_sheets(id) ON DELETE CASCADE,
    expense_product_id INTEGER NOT NULL REFERENCES expense_products(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Create index on balance_sheet_id
  `CREATE INDEX IF NOT EXISTS idx_purchases_sheet_id ON shop_purchases(balance_sheet_id)`,

  // Create trigger for daily_balance_sheets table
  `DROP TRIGGER IF EXISTS update_balance_sheets_updated_at ON daily_balance_sheets`,
  `CREATE TRIGGER update_balance_sheets_updated_at
    BEFORE UPDATE ON daily_balance_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()`,

  // Create trigger for expense_products table
  `DROP TRIGGER IF EXISTS update_expense_products_updated_at ON expense_products`,
  `CREATE TRIGGER update_expense_products_updated_at
    BEFORE UPDATE ON expense_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()`
];

async function runMigrations() {
  console.log('Starting Kasa (Balance Sheet) migrations...');

  try {
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}/${migrations.length}...`);
      await query(migrations[i]);
    }

    console.log('✓ Kasa migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Kasa migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

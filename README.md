# OneStopPOS Backend API

RESTful API backend for OneStopPOS built with Node.js, Express, and PostgreSQL.

## Quick Start

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Then update with your actual credentials:

```env
DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## API Endpoints

For complete API documentation with request/response examples, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Health Check
- `GET /health` - Check server and database status

### Products (`/api/products`)
- `GET /api/products` - Get all products (optional `?search=query`)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/barcode/:barcode` - Get product by barcode
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/stock` - Update stock quantity

### Transactions (`/api/transactions`)
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create transaction (checkout)
- `DELETE /api/transactions/:id` - Delete transaction (void/refund)
- `GET /api/transactions/stats/summary` - Get transaction statistics

### Verisiye - Credit System (`/api/verisiye`)
- `GET /api/verisiye/customers` - Customer management
- `POST /api/verisiye/transactions` - Record credit transactions
- `GET /api/verisiye/reports/daily` - Daily credit reports
- `GET /api/verisiye/reports/by-customer` - Reports by customer
- `POST /api/verisiye/whatsapp/send/:customer_id` - Send WhatsApp alerts

### Kasa - Balance Sheet (`/api/kasa`)
- `GET /api/kasa/expense-products` - Expense product management
- `POST /api/kasa/balance-sheets` - Daily balance sheet creation
- `GET /api/kasa/balance-sheets/:date` - Get balance sheet
- `GET /api/kasa/reports/daily-profit` - Daily profit by product
- `GET /api/kasa/reports/summary` - Daily summary statistics

## Database Schema

Run all migrations before starting the server:

```bash
# Main tables (products, transactions)
node src/db/migrate.js

# Verisiye (Credit) system tables
node src/db/migrate-verisiye.js

# Kasa (Balance Sheet) system tables
node src/db/migrate-kasa.js
```

### Tables:
- `products` - Product inventory
- `transactions` - Sales transactions
- `transaction_items` - Line items for each transaction
- `customers` - Customer information for credit system
- `verisiye_transactions` - Credit transactions
- `expense_products` - Expense product master list
- `daily_balance_sheets` - Daily reconciliation sheets
- `balance_sheet_expenses` - Expense tracking
- `shop_purchases` - Shop inventory purchases

## Project Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── connection.js    # PostgreSQL connection pool
│   │   └── migrate.js       # Database migrations
│   ├── routes/
│   │   ├── products.js      # Product endpoints
│   │   └── transactions.js  # Transaction endpoints
│   └── server.js            # Express app setup
├── .env                     # Environment variables
├── package.json
└── README.md
```

## Features

### Core Features
- ✅ PostgreSQL cloud database (Aiven)
- ✅ RESTful API architecture
- ✅ Transaction support (ACID)
- ✅ Automatic stock management
- ✅ CORS enabled
- ✅ Error handling & request logging
- ✅ SSL connections

### Verisiye (Credit System)
- ✅ Customer management with house number tracking
- ✅ Credit transaction recording
- ✅ Daily and filtered reports
- ✅ WhatsApp payment alerts (configurable)
- ✅ Search by name, house number, date range

### Kasa (Balance Sheet System)
- ✅ Daily reconciliation with auto-calculations
- ✅ Three expense categories (Kasa, K.Kart, Devir)
- ✅ Shop purchase tracking
- ✅ Automatic sales total integration
- ✅ Carryover (Devir) calculations
- ✅ Daily profit reports by product

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run migrations
npm run migrate
```

## Production

```bash
# Build and start
npm start
```

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Get products
curl http://localhost:3001/api/products

# Create product
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{"barcode":"123","name":"Test","priceBuy":1,"priceSell":2,"stock":10}'
```

## License

MIT

# OneStopPOS Backend API Documentation

## Base URL
```
http://localhost:3001
```

---

## Table of Contents
1. [Health & Info](#health--info)
2. [Products API](#products-api)
3. [Transactions API](#transactions-api)
4. [Verisiye (Credit) API](#verisiye-credit-api)
5. [Kasa (Balance Sheet) API](#kasa-balance-sheet-api)
6. [Setup Instructions](#setup-instructions)

---

## Health & Info

### Get API Info
```http
GET /
```
Returns API information and available endpoints.

### Health Check
```http
GET /health
```
Returns server and database health status.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-12T10:30:00.000Z"
}
```

---

## Products API

Base path: `/api/products`

### Get All Products
```http
GET /api/products?search=keyword
```
**Query Parameters:**
- `search` (optional): Search by name or barcode

### Get Product by ID
```http
GET /api/products/:id
```

### Get Product by Barcode
```http
GET /api/products/barcode/:barcode
```

### Create Product
```http
POST /api/products
```
**Request Body:**
```json
{
  "barcode": "1234567890",
  "name": "Product Name",
  "priceBuy": 10.50,
  "priceSell": 15.00,
  "stock": 100,
  "category": "Food",
  "expireDate": "2026-12-31",
  "isByWeight": false,
  "pricePerKg": null,
  "unit": "piece"
}
```

### Update Product
```http
PUT /api/products/:id
```

### Delete Product
```http
DELETE /api/products/:id
```

### Update Product Stock
```http
PATCH /api/products/:id/stock
```
**Request Body:**
```json
{
  "quantity": 10
}
```

---

## Transactions API

Base path: `/api/transactions`

### Get All Transactions
```http
GET /api/transactions?limit=100&offset=0
```
**Query Parameters:**
- `limit` (default: 100): Number of transactions
- `offset` (default: 0): Pagination offset

### Get Single Transaction
```http
GET /api/transactions/:id
```

### Get Transaction Statistics
```http
GET /api/transactions/stats/summary?startDate=2026-01-01&endDate=2026-01-31
```
**Response:**
```json
{
  "total_transactions": 150,
  "total_revenue": 15000.00,
  "total_profit": 3000.00,
  "avg_transaction_value": 100.00
}
```

### Create Transaction (Checkout)
```http
POST /api/transactions
```
**Request Body:**
```json
{
  "date": "2026-01-12T10:30:00.000Z",
  "totalAmount": 150.00,
  "totalProfit": 30.00,
  "items": [
    {
      "productId": 1,
      "name": "Product Name",
      "quantity": 2,
      "priceAtSale": 75.00,
      "costAtSale": 60.00,
      "weight": null,
      "isByWeight": false
    }
  ]
}
```
**Note:** This automatically updates product stock.

### Delete Transaction (Refund)
```http
DELETE /api/transactions/:id
```
**Note:** This restores product stock for non-weight items.

---

## Verisiye (Credit) API

Base path: `/api/verisiye`

### Customer Management

#### Get All Customers
```http
GET /api/verisiye/customers?search=keyword
```
**Query Parameters:**
- `search` (optional): Search by name or house number

**Response:**
```json
[
  {
    "id": 1,
    "name": "Ahmet Yılmaz",
    "house_no": "123",
    "phone": "+905551234567",
    "total_credit": 500.00,
    "transaction_count": 5,
    "total_credit_given": 500.00
  }
]
```

#### Get Single Customer
```http
GET /api/verisiye/customers/:id
```

#### Create Customer
```http
POST /api/verisiye/customers
```
**Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "house_no": "123",
  "phone": "+905551234567"
}
```

#### Update Customer
```http
PUT /api/verisiye/customers/:id
```

#### Delete Customer
```http
DELETE /api/verisiye/customers/:id
```

### Verisiye Transactions

#### Get All Verisiye Transactions
```http
GET /api/verisiye/transactions?customer_id=1&house_no=123&name=Ahmet&start_date=2026-01-01&end_date=2026-01-31&limit=100&offset=0
```
**Query Parameters:**
- `customer_id` (optional): Filter by customer ID
- `house_no` (optional): Filter by house number
- `name` (optional): Filter by customer name
- `start_date` (optional): Start date filter
- `end_date` (optional): End date filter
- `limit` (default: 100)
- `offset` (default: 0)

#### Get Single Verisiye Transaction
```http
GET /api/verisiye/transactions/:id
```

#### Create Verisiye Transaction
```http
POST /api/verisiye/transactions
```
**Request Body:**
```json
{
  "customer_id": 1,
  "amount": 100.00,
  "description": "Grocery items",
  "created_by": "admin"
}
```
**Note:** This automatically updates customer's total credit.

#### Delete Verisiye Transaction
```http
DELETE /api/verisiye/transactions/:id
```

### Verisiye Reports

#### Get Daily Verisiye Summary
```http
GET /api/verisiye/reports/daily?date=2026-01-12
```
**Response:**
```json
{
  "date": "2026-01-12",
  "transaction_count": 5,
  "total_verisiye": 500.00
}
```

#### Get Verisiye Summary by Customer
```http
GET /api/verisiye/reports/by-customer?house_no=123&name=Ahmet&start_date=2026-01-01&end_date=2026-01-31
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Ahmet Yılmaz",
    "house_no": "123",
    "phone": "+905551234567",
    "total_credit": 500.00,
    "transaction_count": 5,
    "total_verisiye": 500.00
  }
]
```

### WhatsApp Alerts

#### Send WhatsApp Alert to Single Customer
```http
POST /api/verisiye/whatsapp/send/:customer_id
```
**Response:**
```json
{
  "success": true,
  "customer": {
    "id": 1,
    "name": "Ahmet Yılmaz",
    "phone": "+905551234567",
    "amount": 500.00
  },
  "messageId": "msg_123456"
}
```

#### Send Bulk WhatsApp Alerts
```http
POST /api/verisiye/whatsapp/send-bulk
```
**Request Body:**
```json
{
  "customer_ids": [1, 2, 3],
  "min_credit_amount": 100.00
}
```
**Response:**
```json
{
  "message": "Sent 3 out of 3 WhatsApp alerts",
  "sent": 3,
  "total": 3,
  "results": [...]
}
```

**Note:** WhatsApp integration requires configuration. See [Setup Instructions](#whatsapp-setup).

---

## Kasa (Balance Sheet) API

Base path: `/api/kasa`

### Expense Products Management

#### Get All Expense Products
```http
GET /api/kasa/expense-products?category=kasa
```
**Query Parameters:**
- `category` (optional): Filter by category (kasa, kart, devir)

#### Create Expense Product
```http
POST /api/kasa/expense-products
```
**Request Body:**
```json
{
  "name": "Bread",
  "category": "kasa"
}
```

#### Update Expense Product
```http
PUT /api/kasa/expense-products/:id
```

#### Delete Expense Product
```http
DELETE /api/kasa/expense-products/:id
```

### Daily Balance Sheets

#### Get All Balance Sheets
```http
GET /api/kasa/balance-sheets?start_date=2026-01-01&end_date=2026-01-31&limit=30&offset=0
```

#### Get Single Balance Sheet
```http
GET /api/kasa/balance-sheets/:date
```
**Example:** `GET /api/kasa/balance-sheets/2026-01-12`

**Response:**
```json
{
  "id": 1,
  "sheet_date": "2026-01-12",
  "kasa_sistem": 5000.00,
  "verisiye_total": 500.00,
  "kasa_nakit": 4000.00,
  "k_kart": 300.00,
  "toplam": 4500.00,
  "fark": 500.00,
  "devir_toplam": 1000.00,
  "notes": "Notes here",
  "expenses": [...],
  "shop_purchases": [...]
}
```

#### Create/Update Balance Sheet
```http
POST /api/kasa/balance-sheets
```
**Request Body:**
```json
{
  "sheet_date": "2026-01-12",
  "verisiye_total": 500.00,
  "kasa_nakit": 4000.00,
  "k_kart": 300.00,
  "notes": "Daily notes",
  "created_by": "admin",
  "expenses": [
    {
      "expense_product_id": 1,
      "expense_type": "kasa_gider",
      "quantity": 10,
      "unit_price": 5.00,
      "total_price": 50.00,
      "notes": "Bread purchase"
    },
    {
      "expense_product_id": 2,
      "expense_type": "kart_gider",
      "quantity": 1,
      "unit_price": 100.00,
      "total_price": 100.00,
      "notes": "Supplies"
    },
    {
      "expense_product_id": 3,
      "expense_type": "devir_gider",
      "quantity": 1,
      "unit_price": 200.00,
      "total_price": 200.00,
      "notes": "Carryover expense"
    }
  ],
  "shop_purchases": [
    {
      "expense_product_id": 4,
      "quantity": 50,
      "unit_cost": 10.00,
      "total_cost": 500.00,
      "supplier": "ABC Supplier",
      "notes": "Weekly stock"
    }
  ]
}
```

**Automatic Calculations:**
- `kasa_sistem`: Automatically fetched from transactions table (total sales for the day)
- `toplam`: Calculated as `kasa_nakit + k_kart + kasa_gider`
- `fark`: Calculated as `kasa_sistem - toplam`
- `devir_toplam`: Calculated as `yesterday_devir - devir_gider + kasa_nakit`

#### Delete Balance Sheet
```http
DELETE /api/kasa/balance-sheets/:date
```

### Kasa Reports

#### Get Daily Profit Report
```http
GET /api/kasa/reports/daily-profit?start_date=2026-01-01&end_date=2026-01-31
```
**Response:**
```json
[
  {
    "sale_date": "2026-01-12",
    "product_id": 1,
    "product_name": "Product Name",
    "barcode": "1234567890",
    "total_quantity": 50,
    "avg_price_sell": 15.00,
    "avg_price_buy": 10.00,
    "total_revenue": 750.00,
    "total_cost": 500.00,
    "total_profit": 250.00
  }
]
```

#### Get Summary Statistics
```http
GET /api/kasa/reports/summary?date=2026-01-12
```
**Response:**
```json
{
  "balance_sheet": {...},
  "expenses_by_type": [
    {
      "expense_type": "kasa_gider",
      "total": 500.00
    },
    {
      "expense_type": "kart_gider",
      "total": 100.00
    },
    {
      "expense_type": "devir_gider",
      "total": 200.00
    }
  ],
  "total_shop_purchases": 500.00
}
```

---

## Setup Instructions

### 1. Database Migration

Before using the new features, run the database migrations:

```bash
# Run main migrations (if not already done)
node src/db/migrate.js

# Run Verisiye migrations
node src/db/migrate-verisiye.js

# Run Kasa migrations
node src/db/migrate-kasa.js
```

### 2. WhatsApp Setup

The WhatsApp integration is currently using a mock implementation for testing. To enable real WhatsApp alerts:

#### Option A: Using Twilio WhatsApp API

1. Sign up for Twilio: https://www.twilio.com/
2. Get WhatsApp sandbox or production API access
3. Install Twilio SDK:
   ```bash
   npm install twilio
   ```
4. Add to `.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```
5. Uncomment Twilio section in `src/utils/whatsapp.js`

#### Option B: Using WhatsApp Cloud API (Meta)

1. Sign up for Meta Business: https://business.facebook.com/
2. Create WhatsApp Business account
3. Get API credentials
4. Install axios:
   ```bash
   npm install axios
   ```
5. Add to `.env`:
   ```env
   WHATSAPP_API_TOKEN=your_api_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   ```
6. Uncomment WhatsApp Cloud API section in `src/utils/whatsapp.js`

### 3. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

---

## Database Schema

### New Tables

#### customers
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `house_no` (VARCHAR)
- `phone` (VARCHAR)
- `total_credit` (DECIMAL)
- `created_at`, `updated_at` (TIMESTAMP)

#### verisiye_transactions
- `id` (SERIAL PRIMARY KEY)
- `customer_id` (FK to customers)
- `amount` (DECIMAL)
- `description` (TEXT)
- `transaction_date` (TIMESTAMP)
- `created_by` (VARCHAR)
- `created_at` (TIMESTAMP)

#### expense_products
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `category` (VARCHAR): 'kasa', 'kart', or 'devir'
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

#### daily_balance_sheets
- `id` (SERIAL PRIMARY KEY)
- `sheet_date` (DATE UNIQUE)
- `kasa_sistem` (DECIMAL): Total sales from system
- `verisiye_total` (DECIMAL): Total credit given
- `kasa_nakit` (DECIMAL): Cash count
- `k_kart` (DECIMAL): Card terminal amount
- `toplam` (DECIMAL): Calculated total
- `fark` (DECIMAL): Difference
- `devir_toplam` (DECIMAL): Carryover total
- `notes` (TEXT)
- `created_by` (VARCHAR)
- `created_at`, `updated_at` (TIMESTAMP)

#### balance_sheet_expenses
- `id` (SERIAL PRIMARY KEY)
- `balance_sheet_id` (FK)
- `expense_product_id` (FK)
- `expense_type` (VARCHAR): 'kasa_gider', 'kart_gider', 'devir_gider'
- `quantity` (INTEGER)
- `unit_price`, `total_price` (DECIMAL)
- `notes` (TEXT)
- `created_at` (TIMESTAMP)

#### shop_purchases
- `id` (SERIAL PRIMARY KEY)
- `balance_sheet_id` (FK)
- `expense_product_id` (FK)
- `quantity` (INTEGER)
- `unit_cost`, `total_cost` (DECIMAL)
- `supplier` (VARCHAR)
- `notes` (TEXT)
- `created_at` (TIMESTAMP)

---

## Features Summary

### ✅ Verisiye (Credit System)
- Customer management with house number and phone
- Track credit transactions
- Daily and filtered reports
- WhatsApp alerts (configurable)
- Search and filter by name, house number, date range

### ✅ Kasa (Balance Sheet System)
- Daily reconciliation with automatic calculations
- Three expense categories (Kasa, K.Kart, Devir)
- Shop purchase tracking
- Automatic sales total from transactions
- Carryover calculations
- Daily profit reports by product

### ✅ Enhanced Transaction System
- Timestamp already included in existing API
- Daily profit calculation by barcode/item

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

---

## Notes

1. **Transaction Timestamps**: The existing `/api/transactions` already saves date/time for each transaction.

2. **Verisiye Calculation**: The daily verisiye total can be automatically calculated from `verisiye_transactions` table filtered by date.

3. **Kasa Sistem**: Automatically calculated from the `transactions` table for the specified date.

4. **Stock Management**: When creating transactions or deleting them, product stock is automatically updated.

5. **Database Transactions**: All multi-step operations use database transactions (BEGIN/COMMIT/ROLLBACK) to ensure data integrity.

6. **WhatsApp**: Currently using mock implementation. Configure real provider in production.

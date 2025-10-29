FinTrack - Software Design Document (v3.0 - Blueprint Edition)

1. Project Overview & Architecture

1.1 Introduction

FinTrack is a comprehensive, self-hosted web application for personal finance management. This document serves as the definitive blueprint for its development.

1.2 System Architecture

Frontend: React with Vite. Styling will be done using Tailwind CSS. Charting will be handled by ECharts.

Backend: Node.js with the Express framework.

Database: PostgreSQL.

API Style: RESTful API. All data will be exchanged in JSON format.

Authentication: JWT (JSON Web Tokens).

2. Database Schema

users

id (SERIAL PRIMARY KEY)

email (VARCHAR(255) UNIQUE NOT NULL)

password_hash (VARCHAR(255) NOT NULL)

created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

accounts

id (SERIAL PRIMARY KEY)

user_id (INTEGER REFERENCES users(id))

name (VARCHAR(255) NOT NULL)

type (VARCHAR(50) NOT NULL) - e.g., 'Checking', 'Savings', 'Credit Card'

initial_balance (DECIMAL(12, 2) NOT NULL DEFAULT 0.00)

categories

id (SERIAL PRIMARY KEY)

user_id (INTEGER REFERENCES users(id))

name (VARCHAR(255) NOT NULL)

type (VARCHAR(10) NOT NULL) - 'Income' or 'Expense'

transactions

id (SERIAL PRIMARY KEY)

user_id (INTEGER REFERENCES users(id))

account_id (INTEGER REFERENCES accounts(id))

category_id (INTEGER REFERENCES categories(id))

date (DATE NOT NULL)

amount (DECIMAL(12, 2) NOT NULL)

type (VARCHAR(10) NOT NULL) - 'Income' or 'Expense'

notes (TEXT)

created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

budgets

id (SERIAL PRIMARY KEY)

user_id (INTEGER REFERENCES users(id))

category_id (INTEGER REFERENCES categories(id))

amount (DECIMAL(12, 2) NOT NULL)

period (VARCHAR(10) NOT NULL) - 'Monthly' or 'Yearly'

investments (Portfolios & Holdings)

portfolio_id (SERIAL PRIMARY KEY)

user_id (INTEGER REFERENCES users(id))

name (VARCHAR(255) NOT NULL)

holding_id (SERIAL PRIMARY KEY)

portfolio_id (INTEGER REFERENCES portfolios(portfolio_id))

ticker_symbol (VARCHAR(20) NOT NULL)

quantity (DECIMAL(12, 4) NOT NULL)

avg_purchase_price (DECIMAL(12, 2) NOT NULL)

manual_assets

id (SERIAL PRIMARY KEY)

user_id (INTEGER REFERENCES users(id))

name (VARCHAR(255) NOT NULL)

type (VARCHAR(50) NOT NULL) - e.g., 'Real Estate', 'Vehicle'

estimated_value (DECIMAL(12, 2) NOT NULL)

associated_debt (DECIMAL(12, 2) DEFAULT 0.00)

3. Application Pages & Views

3.1 Authentication Pages (/login, /register)

Functionality: Handles user login and registration as per section 2.1 of the v2.0 document.

API Endpoints:

POST /api/auth/register

POST /api/auth/login

POST /api/auth/forgot-password

3.2 Dashboard (/)

Functionality: The main landing page, providing an immediate financial snapshot.

API Endpoint: GET /api/dashboard/summary

Response Data Structure:

{
  "netWorth": 125430.50,
  "cashFlowLast30Days": 1500.75,
  "recentTransactions": [ { ...transactionObject } ],
  "netWorthHistory": [ { "date": "2023-09-01", "value": 124000 }, { "date": "2023-10-01", "value": 125430.50 } ],
  "assetAllocation": [ { "class": "Stocks", "value": 80000 }, { "class": "Cash", "value": 25430.50 } ],
  "expenseBreakdown": [ { "category": "Groceries", "total": 450.20 }, { "category": "Utilities", "total": 150.00 } ]
}


Charts:

Net Worth Over Time: Line chart displaying netWorthHistory.

Asset Allocation: Donut chart displaying assetAllocation.

Monthly Expense Breakdown: Bar chart displaying expenseBreakdown.

3.3 Transactions Page (/transactions)

Functionality: View, add, edit, and delete transactions. Import transactions from a file.

Add/Edit Transaction: A modal form.

On save, it sends a POST /api/transactions or PUT /api/transactions/{id} request with transaction data.

Data Import:

The "Import" button opens a multi-step modal for file upload, column mapping, and confirmation.

Endpoint: POST /api/transactions/import (handles file upload with multipart/form-data).

Transaction List: A paginated table displaying all transactions.

Endpoint: GET /api/transactions?page=1&limit=20&sortBy=date&order=desc&filterByCategory=1

API Endpoints:

GET /api/transactions

GET /api/transactions/{id}

POST /api/transactions

PUT /api/transactions/{id}

DELETE /api/transactions/{id}

3.4 Assets & Investments Page (/assets)

Functionality: Manage investment portfolios and other manually tracked assets.

Investment Portfolios:

Users can create/rename portfolios.

Within a portfolio, users can add/edit/remove holdings.

Logic: The frontend displays calculated values (Current Value, Gain/Loss) based on market data fetched from the backend.

Backend Task: A scheduled job runs every hour to fetch latest market prices for all unique tickers using a financial API and caches the results.

Manual Assets: Simple CRUD for real estate, vehicles, etc.

API Endpoints:

GET, POST /api/portfolios

PUT, DELETE /api/portfolios/{id}

GET, POST /api/portfolios/{portfolioId}/holdings

PUT, DELETE /api/holdings/{holdingId}

GET, POST, PUT, DELETE /api/manual-assets

GET /api/market-data (internal or for frontend to get cached prices)

3.5 Budgets Page (/budgets)

Functionality: Create and track spending budgets for various categories.

UI: Displays each budget as a progress bar. The bar's fill percentage is calculated as (current spending in category for the period) / (budgeted amount) * 100.

API Endpoints:

GET /api/budgets (returns budgets and current spending for each)

POST /api/budgets

PUT /api/budgets/{id}

DELETE /api/budgets/{id}

3.6 Reports Page (/reports)

Functionality: A dedicated center for in-depth financial analysis with date filters.

Available Reports & Charts:

Cash Flow Report:

Chart: A multi-bar chart comparing total income and total expenses for each month/year in the selected date range.

Endpoint: GET /api/reports/cashflow?start=...&end=...

Spending by Category:

Chart: A treemap or donut chart showing the percentage of total spending per category. Clicking a category drills down to a list of transactions.

Endpoint: GET /api/reports/spending-by-category?start=...&end=...

Income vs Expense Trend:

Chart: A line chart with two lines: one for total income over time and one for total expenses over time.

Endpoint: GET /api/reports/trends?start=...&end=...

Net Worth History:

Chart: A detailed area chart showing the progression of total net worth over time.

Endpoint: GET /api/reports/networth-history?start=...&end=...

Export Functionality: Each report will have an "Export to CSV" button that hits the same endpoint but with a query parameter like &format=csv, prompting a file download.

3.7 Settings Page (/settings)

Functionality: Manage user profile, accounts, and categories.

Sections:

Profile: Change email/password.

Accounts: CRUD operations for bank accounts, credit cards, etc.

Categories: CRUD operations for income/expense categories.

API Endpoints:

GET, POST, PUT, DELETE /api/accounts

GET, POST, PUT, DELETE /api/categories
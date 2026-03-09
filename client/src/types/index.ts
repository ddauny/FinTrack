// Global types for FinTrack application

// API Response Types
export interface LoginResponse {
  token: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
}

export interface DashboardSummary {
  netWorth: number;
  netWorthGrowth?: number | null;
  cashFlowLast30Days: number;
  monthlyExpenses: number;
  recentTransactions: Transaction[];
  netWorthHistory: NetWorthPoint[];
  assetAllocation: AssetAllocation[];
  latestAllocationDate?: string;
  expenseBreakdown: ExpenseBreakdown[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Transaction {
  id: number;
  amount: number;
  date: string;
  notes?: string;
  category?: {
    name: string;
    type: string;
  };
  tags?: Tag[];
}

export interface NetWorthPoint {
  date: string;
  value: number;
}

export interface AssetAllocation {
  class: string;
  value: number;
}

export interface ExpenseBreakdown {
  category: string;
  total: number;
}

export interface Budget {
  id: number;
  period: string;
  categoryId: number;
  amount: number;
  spent?: number;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  initialBalance: number;
}

export interface Category {
  id: number;
  name: string;
  type: string;
}

export interface Portfolio {
  id: number;
  name: string;
  userId: number;
  holdings?: Holding[];
}

export interface Holding {
  id: number;
  portfolioId: number;
  tickerSymbol: string;
  quantity: number | any; // Prisma Decimal type
  avgPurchasePrice: number | any; // Prisma Decimal type
}

export interface ManualAsset {
  id: number;
  name: string;
  estimatedValue: number;
  associatedDebt: number;
  userId: number;
}

// Component Props Types
export interface PrivacyNumberProps {
  value: number | string;
  className?: string;
  children?: React.ReactNode;
}
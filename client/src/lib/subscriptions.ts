export const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  BIMONTHLY: 'Every 2 months',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
}

export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'WEEKLY': return amount * 52 / 12
    case 'BIWEEKLY': return amount * 26 / 12
    case 'MONTHLY': return amount
    case 'BIMONTHLY': return amount / 2
    case 'QUARTERLY': return amount / 3
    case 'YEARLY': return amount / 12
    default: return amount
  }
}

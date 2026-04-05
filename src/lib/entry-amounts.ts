export function getDebitAmount(amount: number, debit: boolean): number {
  return debit ? amount : 0;
}

export function getCreditAmount(amount: number, debit: boolean): number {
  return debit ? 0 : amount;
}

import type { Transaction } from './transactionService';

const normalizeVendor = (value: string): string => (value || '').trim().toLowerCase();

const getRefFromSms = (raw?: string): string | null => {
  if (!raw) return null;
  const match = raw.match(/(?:ref(?:\s*no)?|utr|imps\s*ref#?)\s*[:#-]?\s*([a-z0-9]+)/i);
  return match?.[1]?.toLowerCase() || null;
};

export const isPotentialDuplicate = (candidate: Omit<Transaction, 'id' | 'createdAt'>, existing: Transaction[]): { isDuplicate: boolean; matchedId?: string } => {
  const candidateTime = candidate.smsData?.timestamp || 0;
  const candidateRef = getRefFromSms(candidate.smsData?.rawMessage);

  for (const tx of existing) {
    const amountMatch = Math.abs(tx.amount - candidate.amount) < 0.0001;
    if (!amountMatch) continue;

    const senderMatch = (tx.smsData?.sender || '').toLowerCase() === (candidate.smsData?.sender || '').toLowerCase();
    const vendorMatch = normalizeVendor(tx.vendor) === normalizeVendor(candidate.vendor);

    const txTime = tx.smsData?.timestamp || new Date(tx.createdAt).getTime();
    const timeNear = candidateTime > 0 ? Math.abs(txTime - candidateTime) <= 60 * 1000 : false;

    const txRef = getRefFromSms(tx.smsData?.rawMessage);
    const refMatch = !!candidateRef && !!txRef && candidateRef === txRef;

    if (refMatch || (senderMatch && timeNear) || (vendorMatch && senderMatch && amountMatch && timeNear)) {
      return { isDuplicate: true, matchedId: tx.id };
    }
  }

  return { isDuplicate: false };
};

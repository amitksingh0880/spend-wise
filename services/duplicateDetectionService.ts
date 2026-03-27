import type { Transaction } from './transactionService';

const normalizeVendor = (value: string): string => (value || '').trim().toLowerCase();

const getRefCandidatesFromSms = (raw?: string): string[] => {
  if (!raw) return [];

  const candidates = new Set<string>();
  const patterns = [
    /(?:upi\s*)?ref(?:erence)?(?:\s*no)?\s*[:#-]?\s*([a-z0-9\/-]+)/ig,
    /(?:utr|imps\s*ref#?)\s*[:#-]?\s*([a-z0-9\/-]+)/ig,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = pattern.exec(raw);
    while (match) {
      const token = (match[1] || '').toLowerCase().trim();
      if (token) {
        const compact = token.replace(/[^a-z0-9]/g, '');
        if (compact) candidates.add(compact);

        const digitChunks = token.match(/\d{6,}/g) || [];
        digitChunks.forEach(chunk => candidates.add(chunk));
      }
      match = pattern.exec(raw);
    }
  }

  return Array.from(candidates);
};

const getAccountSuffix = (raw?: string): string | null => {
  if (!raw) return null;
  const matches = Array.from(raw.matchAll(/(?:a\/?c|account)\s*(?:no\.?|number)?\s*[:\-\.]?\s*(?:x+|\*+|\.\.\.)?(\d{4,})/gi));
  const last = matches[matches.length - 1]?.[1];
  return last || null;
};

const refsMatch = (candidateRefs: string[], txRefs: string[]): boolean => {
  if (!candidateRefs.length || !txRefs.length) return false;

  for (const left of candidateRefs) {
    for (const right of txRefs) {
      if (left === right) return true;

      const leftDigitsOnly = /^\d+$/.test(left);
      const rightDigitsOnly = /^\d+$/.test(right);
      if (!leftDigitsOnly || !rightDigitsOnly) continue;

      const minLength = 8;
      const enoughLength = left.length >= minLength && right.length >= minLength;
      if (!enoughLength) continue;

      if (left.includes(right) || right.includes(left)) return true;
    }
  }

  return false;
};

export const isPotentialDuplicate = (candidate: Omit<Transaction, 'id' | 'createdAt'>, existing: Transaction[]): { isDuplicate: boolean; matchedId?: string } => {
  const candidateTime = candidate.smsData?.timestamp || 0;
  const candidateRefs = getRefCandidatesFromSms(candidate.smsData?.rawMessage);
  const candidateAccountSuffix = getAccountSuffix(candidate.smsData?.rawMessage);

  for (const tx of existing) {
    const amountMatch = Math.abs(tx.amount - candidate.amount) < 0.0001;
    if (!amountMatch) continue;

    const senderMatch = (tx.smsData?.sender || '').toLowerCase() === (candidate.smsData?.sender || '').toLowerCase();
    const vendorMatch = normalizeVendor(tx.vendor) === normalizeVendor(candidate.vendor);

    const txTime = tx.smsData?.timestamp || new Date(tx.createdAt).getTime();
    const timeNear = candidateTime > 0 ? Math.abs(txTime - candidateTime) <= 60 * 1000 : false;
    const timeVeryNear = candidateTime > 0 ? Math.abs(txTime - candidateTime) <= 2 * 60 * 1000 : false;

    const txRefs = getRefCandidatesFromSms(tx.smsData?.rawMessage);
    const refMatch = refsMatch(candidateRefs, txRefs);
    const txAccountSuffix = getAccountSuffix(tx.smsData?.rawMessage);
    const sameAccount = !!candidateAccountSuffix && !!txAccountSuffix && candidateAccountSuffix === txAccountSuffix;

    const isSmsExpenseDuplicate =
      candidate.type === 'expense' &&
      tx.type === 'expense' &&
      timeVeryNear &&
      sameAccount;

    if (refMatch || (senderMatch && timeNear) || (vendorMatch && senderMatch && amountMatch && timeNear) || isSmsExpenseDuplicate) {
      return { isDuplicate: true, matchedId: tx.id };
    }
  }

  return { isDuplicate: false };
};

'use client';

import { useEffect } from 'react';
import { fetchFamily } from '@/lib/api/family';
import { useFamilyStore } from '@/store/family-store';

export default function FamilyHydrator() {
  const setFamily = useFamilyStore((s) => s.setFamily);

  useEffect(() => {
    fetchFamily()
      .then(setFamily)
      .catch((err) => console.error('FamilyHydrator:', err));
  }, [setFamily]);

  return null;
}

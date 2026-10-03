'use client';

import { useEffect, useState } from 'react';

/** Phones, including landscape. The desk view stays on wider screens. */
const PHONE_QUERY = '(max-width: 980px)';

export function useIsPhone(): boolean | null {
  const [phone, setPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY);
    const apply = () => setPhone(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return phone;
}

'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useMotionOK } from '@/lib/hooks/useMotionOK';

/**
 * Fades each page in. Enter-only on purpose: the App Router swaps the old page out before any
 * exit animation could run, and an `exit` prop without AnimatePresence does nothing.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const motionOK = useMotionOK();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: motionOK ? 6 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col flex-1 h-full"
    >
      {children}
    </motion.div>
  );
}

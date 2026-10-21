'use client'

import dynamic from 'next/dynamic'

/** The shader code only loads in the browser, so it never costs the server render or the first paint. */
const LoadFieldLazy = dynamic(() => import('./LoadField'), {
  ssr: false,
  loading: () => <div className="size-full" aria-hidden />,
})

export default LoadFieldLazy

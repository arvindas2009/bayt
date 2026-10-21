'use client'

import dynamic from 'next/dynamic'

/** The background shader loads in the browser only, after the page itself. */
const AmbientFieldLazy = dynamic(() => import('./AmbientField'), { ssr: false })

export default AmbientFieldLazy

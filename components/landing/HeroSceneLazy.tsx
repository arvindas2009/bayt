'use client'

import dynamic from 'next/dynamic'

/** three.js loads in the browser only, after the poster headline has painted. */
const HeroSceneLazy = dynamic(() => import('./HeroScene'), { ssr: false })

export default HeroSceneLazy

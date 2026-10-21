import SlideLoader from '@/components/ui/SlideLoader'

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-10">
      <SlideLoader label="Loading page" text="Opening the page…" />
    </div>
  )
}

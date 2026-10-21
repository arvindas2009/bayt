import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import FamilyHydrator from '@/components/layout/FamilyHydrator';
import SimDateGate from '@/components/layout/SimDateGate';
import PageTransition from '@/components/layout/PageTransition';
import AmbientFieldLazy from '@/components/visual/AmbientFieldLazy';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No background here: body paints --bg, the ambient shader sits on it (z-0) and the page above it.
  return (
    <div className="min-h-screen">
      <AmbientFieldLazy />
      <SimDateGate>
        <FamilyHydrator />
        <Sidebar />
        <TopBar />
        <main className="relative z-10 h-screen overflow-y-auto pl-20 pt-14">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </SimDateGate>
    </div>
  );
}

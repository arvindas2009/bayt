import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import FamilyHydrator from '@/components/layout/FamilyHydrator';
import PageTransition from '@/components/layout/PageTransition';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <FamilyHydrator />
      <Sidebar />
      <TopBar />
      <main className="pl-16 pt-14 md:pl-56 h-screen overflow-y-auto">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}

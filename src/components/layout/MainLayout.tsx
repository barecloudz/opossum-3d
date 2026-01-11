import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Hexagon Background Pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='104' viewBox='0 0 60 104'%3E%3Cg fill='none' stroke='%2300ff66' stroke-width='1.5' stroke-opacity='0.4'%3E%3Cpath d='M30 0L60 17.3v34.6L30 69.2 0 51.9V17.3L30 0z'/%3E%3Cpath d='M30 34.6L60 51.9v34.6L30 104 0 86.6V51.9L30 34.6z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 104px',
        }}
      />
      <Header />
      <main className="flex-1 pb-20 md:pb-0 relative z-10">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

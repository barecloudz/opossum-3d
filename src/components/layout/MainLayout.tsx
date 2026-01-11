import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Hexagon Background Pattern - 3D style with glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cdefs%3E%3ClinearGradient id='hex-grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a1a'/%3E%3Cstop offset='100%25' stop-color='%230d0d0d'/%3E%3C/linearGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='1' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Cpath d='M28 0L56 14v28L28 56 0 42V14L28 0z' fill='url(%23hex-grad)' stroke='%23222' stroke-width='1'/%3E%3Cpath d='M28 0L56 14v28L28 56 0 42V14L28 0z' fill='none' stroke='%2300ff66' stroke-width='0.5' stroke-opacity='0.3' filter='url(%23glow)'/%3E%3Cpath d='M28 44L56 58v28L28 100 0 86V58L28 44z' fill='url(%23hex-grad)' stroke='%23222' stroke-width='1'/%3E%3Cpath d='M28 44L56 58v28L28 100 0 86V58L28 44z' fill='none' stroke='%2300ff66' stroke-width='0.5' stroke-opacity='0.3' filter='url(%23glow)'/%3E%3C/svg%3E")`,
          backgroundSize: '56px 100px',
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

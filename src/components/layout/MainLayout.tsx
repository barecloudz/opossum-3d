import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import ApparelPopup from '../ApparelPopup';
import AnnouncementBar from '../AnnouncementBar';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <AnnouncementBar />
      <Header />
      <main className="flex-1 pb-20 md:pb-0 relative z-10">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <ApparelPopup />
    </div>
  );
}

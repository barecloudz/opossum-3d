import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-brand-black">
      <AdminSidebar />
      <main className="flex-1 pt-[72px] md:pt-8 px-4 pb-6 md:px-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

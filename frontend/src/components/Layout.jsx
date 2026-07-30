import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './layout.css';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span className="brand-name">Ledger</span>
        </div>

        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Overview
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Customers
          </NavLink>
          <NavLink to="/invoices" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Invoices
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="gym-name">{user?.gymName}</div>
          <div className="manager-name">{user?.fullName}</div>
          <button className="btn btn-ghost" onClick={logout} style={{ marginTop: '0.75rem', width: '100%' }}>
            Log out
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
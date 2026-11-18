import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Warehouse,
  Home,
  ShoppingCart,
  Package,
  Tag,
  History,
  RotateCcw,
  BarChart2,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useApi';
import { useAuthStore } from '../hooks/useAuthStore';

const navigation = [
  {
    group: 'MY STORE',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: Home },
      { path: '/orders', label: 'Orders', icon: ShoppingCart },
    ],
  },
  {
    group: 'INVENTORY MANAGEMENT',
    items: [
      { path: '/products', label: 'Products', icon: Package },
      { path: '/categories', label: 'Categories', icon: Tag },
      { path: '/movements', label: 'Movement History', icon: History },
      { path: '/restock', label: 'Restock Requests', icon: RotateCcw },
    ],
  },
  {
    group: 'REPORTS',
    items: [
      { path: '/insights', label: 'Business Insights', icon: BarChart2 },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();
  const { logout: apiLogout } = useAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const toggleCollapse = () => setCollapsed(!collapsed);
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar fixed lg:relative z-50 transition-all duration-200 ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon" aria-hidden="true">
              <Warehouse size={20} />
            </div>
            {!collapsed && <span>Stockroom</span>}
          </div>
          {/* Desktop collapse toggle */}
          <button
            className="sidebar-toggle lg:block hidden"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Main menu">
          {navigation.map((section, sectionIndex) => (
            <div key={section.group} className="nav-section">
              {!collapsed && (
                <h3 className="nav-section-title">{section.group}</h3>
              )}
              <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.items.map((item, itemIndex) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="nav-item-icon" aria-hidden="true">
                          <Icon size={20} />
                        </span>
                        {!collapsed && <span className="nav-item-text">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer - User & Sign Out */}
        <div className="sidebar-footer">
          {!collapsed && user && (
            <div className="user-info">
              <div className="user-avatar" aria-hidden="true">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
          )}
          <NavLink
            to="/signin"
            className={`nav-item ${collapsed ? 'justify-center' : ''}`}
            onClick={async () => {
              await apiLogout();
              setMobileOpen(false);
            }}
          >
            <span className="nav-item-icon" aria-hidden="true">
              <LogOut size={20} />
            </span>
            {!collapsed && <span className="nav-item-text">Sign Out</span>}
          </NavLink>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn lg:hidden fixed top-4 left-4 z-50"
        onClick={toggleMobile}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        aria-controls="sidebar"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </>
  );
}
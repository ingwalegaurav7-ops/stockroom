import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from './hooks/useApi';
import { useAuthStore } from './hooks/useAuthStore';
import { Sidebar } from './components/Sidebar';
import { Toaster } from './components/ui';
import { SignIn } from './pages/SignIn';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Orders } from './pages/Orders';
import { Movements } from './pages/Movements';
import { Restock } from './pages/Restock';
import { Insights } from './pages/Insights';
import './styles/index.css';
import './styles/theme.css';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  orders: 'Orders',
  movements: 'Movement History',
  restock: 'Restock Requests',
  insights: 'Business Insights',
};

function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40 }} aria-label="Loading" />
    </div>
  );
}

// Auth initialization component
function AuthInitializer({ children }) {
  const { me } = useAuth();
  const { setUser, setIsAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { user } = await me();
        setUser(user);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };
    initAuth();
  }, [me, setUser, setIsAuthenticated]);

  if (isLoading) return <FullPageSpinner />;
  return children;
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  return children;
}

// Public route wrapper (for sign in page)
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

// Main layout: sidebar + breadcrumb header (page titles now live in each page's PageHeader)
function AppLayout() {
  const { pathname } = useLocation();
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const title = PAGE_TITLES[segment] || 'Stockroom';

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" role="main">
        <header className="header" role="banner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/dashboard">Stockroom</Link>
            <span aria-hidden="true">/</span>
            <span className="breadcrumb-current" aria-current="page">{title}</span>
          </nav>
          <div className="header-right">
            <Link to="/insights" className="icon-btn" aria-label="View stock alerts" title="Stock alerts">
              <Bell size={18} />
            </Link>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <Routes>
          {/* Public routes */}
          <Route
            path="/signin"
            element={
              <PublicRoute>
                <SignIn />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/restock" element={<Restock />} />
            <Route path="/insights" element={<Insights />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthInitializer>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
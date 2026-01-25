import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, GitBranch, Settings, Menu, X } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Pipelines', href: '/pipelines', icon: GitBranch },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-background" data-testid="app-layout">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
            <div>
              <h1 className="text-xl font-heading font-semibold text-foreground" data-testid="app-title">
                Build Inspector
              </h1>
              <p className="text-xs text-muted-foreground">Pipeline Monitor</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2" data-testid="navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-secondary text-foreground border-r-2 border-running'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p>GitLab Pipeline Monitor</p>
              <p className="mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between lg:justify-end" data-testid="header">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-secondary"
            data-testid="sidebar-toggle"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" data-testid="status-indicator" />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" data-testid="main-content">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}
    </div>
  );
};

export default Layout;
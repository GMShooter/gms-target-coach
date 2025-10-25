import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <header className="border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img 
              src="/GMShoot_logo.png" 
              alt="GMShoot Logo" 
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold text-foreground">GMShoot</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
            <Button variant="ghost" size="sm">
              Sessions
            </Button>
            <Button variant="ghost" size="sm">
              History
            </Button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2024 GMShoot v2. Precision shooting analysis.
            </p>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                About
              </Button>
              <Button variant="ghost" size="sm">
                Support
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
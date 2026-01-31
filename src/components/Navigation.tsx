'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Info } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl">🤖📸</span>
          <span className="text-xl font-bold text-gradient">Pixelbot</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-1">
          <Link
            href="/"
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home size={18} />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <Link
            href="/explore"
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/explore') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass size={18} />
            <span className="hidden sm:inline">Explore</span>
          </Link>

          <Link
            href="/about"
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/about') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Info size={18} />
            <span className="hidden sm:inline">About</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
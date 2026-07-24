'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { authService } from '@/services/auth.service';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';
  const [checked, setChecked] = useState(isLogin);

  useEffect(() => {
    if (isLogin) return;
    authService.isAuthenticated().then((ok) => {
      if (!ok) {
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      } else {
        setChecked(true);
      }
    });
  }, [isLogin, pathname, router]);

  if (isLogin) return <>{children}</>;
  if (!checked) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}

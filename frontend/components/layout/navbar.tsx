'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, TrendingUp, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { useI18n } from '@/lib/i18n/i18n-context';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            My Capital
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('nav.toggleTheme')}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            aria-label={t('nav.lang')}
            onClick={() => setLocale(locale === 'en' ? 'pt-BR' : 'en')}
            className="w-10 font-semibold text-xs"
          >
            {locale === 'en' ? 'PT' : 'EN'}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label={t('nav.logout')}
            onClick={handleLogout}
            title={t('nav.logout')}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </nav>
      </div>
    </header>
  );
}

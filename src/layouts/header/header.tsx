// components/layout/header.tsx
'use client';

import { useRouter } from 'next/navigation';
import cn from '@/utils/cn';
import LogoIcon from '@/components/ui/logo-icon';
import { useWindowScroll } from '@/lib/hooks/use-window-scroll';
import Hamburger from '@/components/ui/hamburger';
import SearchButton from '@/components/search/button';
import { useIsMounted } from '@/lib/hooks/use-is-mounted';
import { useDrawer } from '@/components/drawer-views/context';
import routes from '@/config/routes';

function HeaderRightArea() {
  return <div className="relative order-last flex shrink-0 items-center gap-4 sm:gap-6 lg:gap-8" />;
}

// ... rest of your header components remain the same ...

export function RetroHeader({ className }: { className?: string }) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const { openDrawer } = useDrawer();
  const windowScroll = useWindowScroll();
  return (
    <nav
      className={cn(
        'sticky top-0 z-30 h-16 w-full backdrop-blur transition-all duration-300 sm:h-20 3xl:h-24 ltr:right-0 rtl:left-0',
        isMounted && windowScroll.y > 17 ? 'bg-white/80 shadow-card dark:bg-dark/80' : '',
        className,
      )}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8 3xl:px-10">
        <div className="flex items-center">
          <div onClick={() => router.push(routes.home)} className="flex items-center xl:hidden">
            <LogoIcon />
          </div>
          <div className="mx-2 block sm:mx-4 xl:hidden">
            <Hamburger isOpen={false} variant="transparent" onClick={() => openDrawer('RETRO_SIDEBAR')} className="dark:text-white" />
          </div>
          <SearchButton variant="transparent" className="dark:text-white ltr:-ml-[17px] rtl:-mr-[17px]" />
        </div>
        <HeaderRightArea />
      </div>
    </nav>
  );
}

export function ClassicHeader({ className }: { className?: string }) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const { openDrawer } = useDrawer();
  const windowScroll = useWindowScroll();
  return (
    <nav
      className={cn(
        'sticky top-0 z-30 h-16 w-full backdrop-blur transition-all duration-300 sm:h-20 3xl:h-24 ltr:right-0 rtl:left-0',
        ((isMounted && windowScroll.y) as number) > 2 ? 'bg-white/80 shadow-card dark:bg-dark/80' : '',
        className,
      )}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8 3xl:px-10">
        <div className="flex items-center">
          <div onClick={() => router.push(routes.home)} className="flex items-center xl:hidden">
            <LogoIcon />
          </div>
          <div className="mx-2 block sm:mx-4 xl:hidden">
            <Hamburger isOpen={false} variant="transparent" onClick={() => openDrawer('CLASSIC_SIDEBAR')} className="dark:text-white" />
          </div>
          <SearchButton variant="transparent" className="dark:text-white ltr:-ml-[17px] rtl:-mr-[17px]" />
        </div>
        <HeaderRightArea />
      </div>
    </nav>
  );
}

export default function Header({ className }: { className?: string }) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const { openDrawer } = useDrawer();
  const windowScroll = useWindowScroll();
  return (
    <nav
      className={cn(
        'sticky top-0 z-30 h-16 w-full backdrop-blur transition-shadow duration-300 sm:h-20 3xl:h-24 ltr:right-0 rtl:left-0',
        ((isMounted && windowScroll.y) as number) > 2 ? 'bg-white/80 shadow-card dark:bg-dark/80' : '',
        className,
      )}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8 3xl:px-10">
        <div className="flex items-center">
          <div onClick={() => router.push(routes.home)} className="flex items-center xl:hidden">
            <LogoIcon />
          </div>
          <div className="mx-2 block sm:mx-4 xl:hidden">
            <Hamburger isOpen={false} variant="transparent" onClick={() => openDrawer('DEFAULT_SIDEBAR')} className="dark:text-white" />
          </div>
          <SearchButton variant="transparent" className="dark:text-white ltr:-ml-[17px] rtl:-mr-[17px]" />
        </div>
        <HeaderRightArea />
      </div>
    </nav>
  );
}

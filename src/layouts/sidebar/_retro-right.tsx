'use client';

import cn from '@/utils/cn';
import Scrollbar from '@/components/ui/scrollbar';
// Removed finance-specific widgets

export default function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'top-0 z-20 h-full w-full max-w-full border-dashed border-slate-200 ltr:left-0 rtl:right-0 dark:border-gray-700 lg:fixed lg:w-80 ltr:lg:border-l rtl:lg:border-r xl:pt-20 3xl:w-[350px]',
        className,
      )}
    >
      <div className="absolute right-0 top-0 z-20 h-[75px] w-full bg-sidebar-body dark:bg-dark md:block xl:hidden" />
      <Scrollbar style={{ height: 'calc(100% + 20px)' }}>
        <div className="relative z-20 pb-5">
          <div className="mx-5 my-16 flex h-full flex-col overflow-x-hidden rounded-lg bg-transparent sm:mx-6 lg:mx-0 lg:p-6 xl:my-0 2xl:p-8">
            <div className="w-full">
              <h3 className="mb-3 text-center text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Tips
              </h3>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <li>Use Near Me or Mexico City quick-jump to find spots.</li>
                <li>Connect wallet to add a spot and upload photos.</li>
                <li>Early morning sessions avoid crowds at popular plazas.</li>
              </ul>
            </div>
          </div>
        </div>
      </Scrollbar>
    </aside>
  );
}

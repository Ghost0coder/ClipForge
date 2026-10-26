import React, { useState, useRef, useEffect } from 'react';
import { Home, FolderKanban, LayoutTemplate, Box, Settings, HelpCircle, Film, Pin, PinOff } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { useResponsive } from '../utils/useResponsive';

export const AppNavigation = () => {
  const { route, setRoute, sidebarPinned, setSidebarPinned } = useEditorStore();
  const { isMobile } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const lastScrollY = useRef(0);
  const leaveTimerRef = useRef(null);

  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = (e) => {
      const currentScrollY = e.target.scrollTop || window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 30) {
        setShowBottomNav(false);
      } else {
        setShowBottomNav(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isMobile]);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'assets', label: 'Assets', icon: Box },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  if (isMobile) {
    return (
      <nav
        aria-label="Mobile Navigation"
        className={`fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-[#1A1A1A] border-t border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-around px-2 shrink-0 z-40 pb-safe transition-transform duration-200 ${
          showBottomNav ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#3B82F6]'
                  : 'text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" strokeWidth={1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  const isExpanded = sidebarPinned || isHovered;

  return (
    <aside
      aria-label="Sidebar Navigation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`absolute left-0 top-0 bottom-0 z-50 bg-white dark:bg-[#151515] border-r border-[#E5E5E5] dark:border-[#2A2A2A] flex flex-col shrink-0 select-none transition-all duration-200 shadow-xl ${
        isExpanded ? 'w-56' : 'w-14'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-[6px] bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#171717] flex items-center justify-center shrink-0 shadow-xs">
            <Film className="w-4 h-4" strokeWidth={1.5} />
          </div>
          {isExpanded && (
            <div className="truncate">
              <h1 className="text-xs font-semibold tracking-tight text-[#171717] dark:text-[#EDEDED]">ClipForge</h1>
              <p className="text-[10px] text-[#737373] dark:text-[#A1A1A1]">Video Suite</p>
            </div>
          )}
        </div>

        {isExpanded && (
          <button
            onClick={() => setSidebarPinned(!sidebarPinned)}
            className="p-1 rounded text-[#737373] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
            title={sidebarPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
          >
            {sidebarPinned ? <Pin className="w-3.5 h-3.5 text-[#3B82F6]" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                  : 'text-[#737373] dark:text-[#A1A1A1] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] hover:text-[#171717] dark:hover:text-[#EDEDED]'
              }`}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Footer Pin / Status */}
      {isExpanded && (
        <div className="p-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
          <div className="bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[8px] p-2.5">
            <p className="text-[10px] font-medium text-[#171717] dark:text-[#EDEDED] mb-0.5">ClipForge Pro v2.5</p>
            <button
              onClick={() => setRoute('settings')}
              className="w-full mt-1 py-1 rounded-[6px] bg-white dark:bg-[#262626] border border-[#E5E5E5] dark:border-[#333333] text-[10px] font-medium text-[#171717] dark:text-[#EDEDED] hover:bg-[#F5F5F5] dark:hover:bg-[#333333] transition-colors cursor-pointer"
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

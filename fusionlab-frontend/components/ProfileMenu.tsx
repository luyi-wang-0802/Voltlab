
import React, { useState } from 'react';

interface ProfileMenuProps {
  userName: string;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenProfileWithTab: (tab: 'MY EVENTS' | 'SEAT BOOKINGS' | 'ROOM BOOKINGS') => void;
  isActive: boolean;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ userName, onLogout, onOpenProfile, onOpenProfileWithTab, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Derive a dummy email from username for visual fidelity
  const userEmail = `${userName.toLowerCase().replace(/\s/g, '')}@gmail.com`;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Profile Icon Trigger */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onOpenProfile();
        }}
        className={`w-10 h-10 flex items-center justify-center overflow-hidden transition-all duration-300 z-50 ${
          isActive || isOpen ? 'ring-2 ring-blue-600 ring-offset-2' : 'hover:ring-2 hover:ring-slate-100'
        }`}
      >
        <div className="w-full h-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-black uppercase">{userName.charAt(0)}</span>
        </div>
      </button>

      {/* Behance-styled Dropdown */}
      <div 
        className={`absolute right-0 mt-3 w-72 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 origin-top-right transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 -translate-y-2 invisible'
        }`}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        {/* User Header Section */}
        <div className="pt-8 pb-6 px-6 text-center">
           <div className="w-20 h-20 bg-blue-600 mx-auto mb-4 flex items-center justify-center border-4 border-slate-200 shadow-md" style={{ borderRadius: 0 }}>
             <div className="text-white text-3xl font-black">
               {userName.charAt(0)}
             </div>
           </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-1">{userName}</h3>
          <p className="text-[12px] text-slate-400 font-medium">{userEmail}</p>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-slate-100 w-full" />

        {/* Section: Main Links */}
        <div className="py-2">
          {[
            'MY EVENTS',
            'SEAT BOOKINGS',
            'ROOM BOOKINGS'
          ].map((label, idx) => (
            <button 
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfileWithTab(label as 'MY EVENTS' | 'SEAT BOOKINGS' | 'ROOM BOOKINGS');
                setIsOpen(false);
              }}
              className="w-full text-left px-6 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-slate-100 w-full" />

        {/* Sign Out Footer */}
        <div className="p-2 bg-slate-50">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            className="w-full py-3 text-[14px] font-bold text-slate-900 bg-white border border-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-300"
            style={{ borderRadius: 0 }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileMenu;


import React, { useState, useEffect } from 'react';
import EventExperience from './components/EventExperience';
import WalkthroughExperience from './components/WalkthroughExperience';
import Room360View from './components/Room360View';
import Profile from './components/Profile';
import NavigationExperience from './components/NavigationExperience';
import StorytellingView from './components/StorytellingView';
import ViewerView from './components/ViewerView';
import WhereToGoExperience from './components/WhereToGoExperience';
import BookingExperience from './components/BookingExperience';
import LoadingScreen from './components/LoadingScreen';
import SpaceTour from './components/SpaceTour';
import LoginModal from './components/LoginModal';
import ProfileMenu from './components/ProfileMenu';
import EventDetailModal, { EventData } from './components/EventDetailModal';
import { login, verifySession} from './services/api';

export type Category = 'Storytelling' | 'Walkthrough' | 'Event' | 'Booking' | 'Where To Go' | 'Navigation' | 'Viewer';
export type EventFilter = 'All' | 'Academic' | 'Leisure';
type View = 'Main' | 'Profile';
type FlowState = 'loading' | 'tour' | 'main';

export interface RoomData {
  id: string;
  name: string;
  floor: number;
  imageUrl: string;
  description?: string;
}

interface PendingAction {
  type: 'reserve' | 'booking';
  data?: any;
}

const App: React.FC = () => {
  const [flow, setFlow] = useState<FlowState>('loading');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category>('Storytelling');
  const [currentView, setCurrentView] = useState<View>('Main');
  const [focusedFloor, setFocusedFloor] = useState<number | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [walkthroughFloor, setWalkthroughFloor] = useState<number>(5); // 保存Walkthrough的当前楼层
  const [hoveredRoom, setHoveredRoom] = useState<RoomData | null>(null);
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [eventSource, setEventSource] = useState<'Event' | 'Profile'>('Event'); // 跟踪事件来源
  const [eventFilter, setEventFilter] = useState<EventFilter>('All');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showReserveSuccess, setShowReserveSuccess] = useState(false);
  const [profileTab, setProfileTab] = useState<'MY EVENTS' | 'SEAT BOOKINGS' | 'ROOM BOOKINGS'>('MY EVENTS');
  const [showMobileNav, setShowMobileNav] = useState(false);
  
  // Real user data
  const [reservedEvents, setReservedEvents] = useState<EventData[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const categories: Category[] = ['Storytelling', 'Walkthrough', 'Event', 'Booking', 'Where To Go', 'Navigation', 'Viewer'];

  // Clear navigation target when switching away from Navigation page
  useEffect(() => {
    if (currentCategory !== 'Navigation' && targetRoomId) {
      setTargetRoomId(null);
    }
  }, [currentCategory, targetRoomId]);
  
  const handleLogin = async (name: string) => {
    try {
      // 调用后端API创建session
      const sessionData = await login(name);
      
      // 保存session ID和用户名到localStorage
      localStorage.setItem('sessionId', sessionData.id);
      localStorage.setItem('userName', sessionData.name);
      
      // 更新前端状态
      setUserName(sessionData.name);
      setSessionId(sessionData.id);
      setIsLoggedIn(true);
      setShowLoginModal(false);

      // Process pending actions
      if (pendingAction) {
        if (pendingAction.type === 'reserve' && pendingAction.data) {
          toggleReserve(pendingAction.data);
        }
        setPendingAction(null);
      }
      
      console.log('登录成功，Session ID:', sessionData.id);
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败，请检查网络连接或联系管理员');
    }
  };

  const handleLogout = () => {
    // 清除localStorage中的session数据
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userName');
    
    setIsLoggedIn(false);
    setUserName('');
    setSessionId(null);
    setReservedEvents([]);
    setCurrentView('Main');
    setCurrentCategory('Storytelling');
    
    console.log('已退出登录');
  };

  const toggleReserve = (event: EventData) => {
    setReservedEvents(prev => {
      const exists = prev.find(e => e.title === event.title);
      if (exists) {
        return prev.filter(e => e.title !== event.title);
      }
      return [...prev, event];
    });
  };

  const triggerLoginForReserve = (event: EventData) => {
    setPendingAction({ type: 'reserve', data: event });
    setShowLoginModal(true);
  };

  const triggerLoginForBooking = () => {
    setPendingAction({ type: 'booking' });
    setShowLoginModal(true);
  };

  const handleReserveClick = (event: any) => {
    if (!isLoggedIn) {
      // 未登录，转换为EventData格式并触发登录
      const eventData: EventData = {
        url: event.imageUrl,
        title: event.title,
        description: event.description,
        slogan: event.slogan || '',
        floor: 1,
        category: event.category,
        date: event.date,
        time: event.time,
        location: event.location
      };
      triggerLoginForReserve(eventData);
    } else {
      // 已登录，显示预定成功
      const eventData: EventData = {
        url: event.imageUrl,
        title: event.title,
        description: event.description,
        slogan: event.slogan || '',
        floor: 1,
        category: event.category,
        date: event.date,
        time: event.time,
        location: event.location
      };
      toggleReserve(eventData);
      setShowReserveSuccess(true);
      setTimeout(() => setShowReserveSuccess(false), 3000);
    }
  };

  const handleProfileViewOpen = () => {
    setCurrentView('Profile');
    setSelectedRoom(null);
    setProfileTab('MY EVENTS');
  };

  const handleProfileViewOpenWithTab = (tab: 'MY EVENTS' | 'SEAT BOOKINGS' | 'ROOM BOOKINGS') => {
    setProfileTab(tab);
    setCurrentView('Profile');
    setSelectedRoom(null);
  };

  // 自动检查已保存的session
  useEffect(() => {
    const savedSessionId = localStorage.getItem('sessionId');
    const savedUserName = localStorage.getItem('userName');
    
    if (savedSessionId && savedUserName) {
      // 验证session是否仍然有效
      verifySession(savedSessionId)
        .then((sessionData) => {
          setUserName(sessionData.name);
          setSessionId(savedSessionId);
          setIsLoggedIn(true);
          console.log('自动登录成功');
        })
        .catch((error) => {
          // Session无效，清除本地存储
          console.log('Session已过期，需要重新登录');
          localStorage.removeItem('sessionId');
          localStorage.removeItem('userName');
        });
    }
  }, []);

  // Monitor scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset scroll state when changing category with animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsScrolled(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [currentCategory]);

  // --- Walkthrough/360 动画 hooks 顶层 ---
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [show360, setShow360] = useState(false);
  useEffect(() => {
    if (currentCategory !== 'Walkthrough') {
      setShow360(false);
      setIsTransitioning(false);
      return;
    }
    if (selectedRoom) {
      setIsTransitioning(true);
      setTimeout(() => {
        setShow360(true);
        setIsTransitioning(false);
      }, 400);
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setShow360(false);
        setIsTransitioning(false);
      }, 400);
    }
  }, [selectedRoom, currentCategory]);

  const renderCategoryContent = () => {
    if (currentCategory === 'Storytelling') {
      return (
        <div className="pointer-events-auto w-full">
          <StorytellingView onScroll={(scrolled) => setIsScrolled(scrolled)} />
        </div>
      );
    }
    if (currentCategory === 'Viewer') {
      return (
        <div className="pointer-events-auto w-full h-full overflow-x-hidden">
          <ViewerView />
        </div>
      );
    }
    if (currentCategory === 'Where To Go') {
      return (
        <div className="pointer-events-auto w-full h-full overflow-x-hidden">
        <WhereToGoExperience 
          onNavigate={(roomId) => {
            setNavTarget(roomId);
            setCurrentCategory('Navigation');
          }} 
        />
        </div>
      );
    }
    if (currentCategory === 'Booking') {
      return (
        <div className="pointer-events-auto w-full h-full overflow-x-hidden">
          <BookingExperience 
            isLoggedIn={isLoggedIn} 
            onTriggerLogin={triggerLoginForBooking}
            sessionId={sessionId}
          />
        </div>
      );
    }
    if (currentCategory === 'Walkthrough') {
      return (
        <>
          {/* WalkthroughExperience 3D视图 */}
          <div
            className="absolute inset-0 w-full h-full z-0 pointer-events-auto overflow-x-hidden"
            style={{
              transition: 'transform 0.4s cubic-bezier(0,0,0.2,1), opacity 0.4s cubic-bezier(0,0,0.2,1)',
              transform: selectedRoom ? 'scale(1.03)' : 'scale(1)',
              opacity: selectedRoom ? 0 : 1,
              pointerEvents: selectedRoom ? 'none' : 'auto',
            }}
          >
            <WalkthroughExperience
              onSelectRoom={(room) => setSelectedRoom(room)}
              onHoverRoom={(room) => setHoveredRoom(room)}
              initialFloor={walkthroughFloor}
              onFloorChange={(floor) => setWalkthroughFloor(floor)}
            />
          </div>
          {/* 360 视图 */}
          <div
            className="absolute inset-0 w-full h-full z-10 pointer-events-auto overflow-x-hidden"
            style={{
              transition: 'opacity 0.45s cubic-bezier(0,0,0.2,1)',
              opacity: selectedRoom && show360 ? 1 : 0,
              pointerEvents: selectedRoom && show360 ? 'auto' : 'none',
            }}
          >
            {selectedRoom && show360 && (
              <Room360View
                room={selectedRoom}
                onClose={() => setSelectedRoom(null)}
              />
            )}
          </div>
        </>
      );
    }
    if (currentCategory === 'Navigation') {
      return (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-auto overflow-x-hidden">
          <NavigationExperience 
            targetRoom={targetRoomId}
            onSearch={(id) => setTargetRoomId(id)}
          />
        </div>
      );
    }
    if (currentCategory === 'Event') {
      return (
        <>
          <div className="absolute inset-0 w-full h-full z-0 pointer-events-auto overflow-x-hidden">
            <EventExperience 
              isExploded={true} 
              focusedFloor={focusedFloor}
              hoveredFloor={hoveredFloor}
              onSelectFloor={(idx) => setFocusedFloor(idx)}
              onSelectEvent={(event) => {
                setEventSource('Event');
                setSelectedEvent(event);
              }}
              isModalOpen={!!selectedEvent}
              eventFilter={eventFilter}
              reservedEventTitles={reservedEvents.map(e => e.title)}
              onScroll={(scrolled) => setIsScrolled(scrolled)}
              onReserveClick={handleReserveClick}
            />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div 
      className={`relative w-full cursor-default select-none bg-white ${
        currentCategory === 'Storytelling' ? 'min-h-screen' : 'h-screen overflow-hidden'
      }`}
      style={{
        overflowX: currentCategory !== 'Storytelling' ? 'hidden' : 'visible',
        maxWidth: currentCategory !== 'Storytelling' ? '100vw' : 'none'
      }}
    >
      {/* 1. INITIAL LOGO LOADING */}
      {flow === 'loading' && <LoadingScreen onComplete={() => setFlow('tour')} />}

      {/* 2. INTERACTIVE SPACE TOUR */}
      {flow === 'tour' && <SpaceTour onComplete={() => setFlow('main')} />}

      {/* 3. MAIN DASHBOARD */}
      {flow === 'main' && (
        <div className="w-full h-full animate-in fade-in duration-1000">
          <nav className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 md:px-10 transition-all duration-[800ms] ${(isScrolled || currentCategory === 'Viewer') ? 'py-3 bg-white/95 backdrop-blur-sm shadow-sm' : 'py-8'}`} style={{ background: (isScrolled || currentCategory === 'Viewer') ? 'rgba(255,255,255,0.95)' : 'none', boxShadow: (isScrolled || currentCategory === 'Viewer') ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', backdropFilter: (isScrolled || currentCategory === 'Viewer') ? 'blur(8px)' : 'none' }}>
            <button 
              onClick={() => {
                setCurrentView('Main');
                setCurrentCategory('Storytelling');
                setSelectedRoom(null);
                setFocusedFloor(null);
              }}
              className="flex items-center group pointer-events-auto"
            >
              {/* Stair Logo in Nav */}
              <div className="w-8 h-8 mr-3 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                <svg 
                  viewBox="0 0 100 100" 
                  className="w-full h-full overflow-visible"
                  fill="none"
                  stroke="#0066ff"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                >
                  {/* Architectural Stair Path */}
                  <path
                    d="M 15 85 L 40 85 L 40 60 L 65 60 L 65 35 L 90 35 L 90 10 L 65 10 L 65 35 L 40 35 L 40 60 L 15 60 Z"
                    className="logo-outline"
                  />
                </svg>
              </div>
              <span className="text-xl font-black tracking-normal uppercase text-slate-900">
                VoltLab
              </span>
            </button>

            {/* 桌面端导航 */}
            <div className="hidden md:flex items-center space-x-10 pointer-events-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentView('Main');
                    if (cat === 'Walkthrough' && currentCategory !== 'Walkthrough') {
                      setWalkthroughFloor(5);
                    }
                    setIsScrolled(false);
                    setCurrentCategory(cat);
                    setSelectedRoom(null);
                    setFocusedFloor(null);
                  }}
                  className={`text-[13px] uppercase tracking-[0.18em] font-semibold transition-all duration-300 hover:text-blue-600 ${
                    currentView === 'Main' && currentCategory === cat ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
              
              {isLoggedIn ? (
                <ProfileMenu 
                  userName={userName} 
                  onLogout={handleLogout} 
                  onOpenProfile={handleProfileViewOpen}
                  onOpenProfileWithTab={handleProfileViewOpenWithTab}
                  isActive={currentView === 'Profile'}
                />
              ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-white bg-slate-900 hover:bg-slate-700 transition-all px-8 py-2.5 rounded"
                >
                  Log in
                </button>
              )}
            </div>

            {/* 移动端 MENU/CLOSE 按钮 */}
            <div className="md:hidden flex items-center pointer-events-auto">
              <button
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="text-black font-bold uppercase tracking-widest bg-transparent border-none shadow-none p-0 m-0 hover:bg-transparent focus:outline-none"
                aria-label={showMobileNav ? 'Close menu' : 'Open menu'}
                style={{ letterSpacing: '0.18em', fontSize: '13px' }}
              >
                {showMobileNav ? 'CLOSE' : 'MENU'}
              </button>
            </div>
          </nav>

          <main className={`relative z-10 w-full h-full transition-opacity duration-1000 pointer-events-none`}>
            {currentView === 'Profile' ? (
              <div className="pointer-events-auto w-full h-full overflow-x-hidden">
              <Profile 
                userName={userName} 
                onClose={() => setCurrentView('Main')} 
                reservedEvents={reservedEvents}
                initialTab={profileTab}
                onSelectEvent={(event) => {
                  setEventSource('Profile');
                  setSelectedEvent(event);
                }}
                onExploreEvents={() => {
                  setCurrentView('Main');
                  setCurrentCategory('Event');
                }}
              />
              </div>
            ) : (
              renderCategoryContent()
            )}
          </main>
        </div>
      )}

      {/* 移动端全屏下拉菜单 */}
      <div
        className={`fixed inset-0 z-[100] bg-white transition-transform duration-[700ms]`} // 700ms for slower effect
        style={{
          transitionTimingFunction: 'cubic-bezier(0.7,0,0.3,1)', // fast then slow
          pointerEvents: showMobileNav ? 'auto' : 'none',
          minHeight: '100vh',
          transform: showMobileNav ? 'translateY(0)' : 'translateY(-100%)',
        }}
      >
        {/* 顶部 CLOSE 按钮，与导航栏对齐 */}
        <div className="flex items-center justify-end px-4 py-10">
          <button
            onClick={() => setShowMobileNav(false)}
            className="text-black font-bold uppercase tracking-widest bg-transparent border-none shadow-none p-0 m-0 hover:bg-transparent focus:outline-none"
            style={{ letterSpacing: '0.18em', fontSize: '13px' }}
            aria-label="Close menu"
          >
            CLOSE
          </button>
        </div>
        {/* 导航菜单 */}
        <div className="flex flex-col space-y-1 mb-8 px-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCurrentView('Main');
                if (cat === 'Walkthrough' && currentCategory !== 'Walkthrough') {
                  setWalkthroughFloor(5);
                }
                setIsScrolled(false);
                setCurrentCategory(cat);
                setSelectedRoom(null);
                setFocusedFloor(null);
                setShowMobileNav(false);
              }}
              className={`text-left text-base font-medium uppercase tracking-wide py-3 px-4 rounded-lg transition-all ${
                currentView === 'Main' && currentCategory === cat 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* 登录/个人中心 */}
        <div className="mt-auto pt-6 border-t border-slate-200 px-6 pb-10">
          {isLoggedIn ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  handleProfileViewOpen();
                  setShowMobileNav(false);
                }}
                className={`w-full text-left text-base font-bold uppercase tracking-wide py-3 px-4 rounded-lg transition-all ${
                  currentView === 'Profile'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                👤 {userName}
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileNav(false);
                }}
                className="w-full text-left text-sm font-semibold uppercase tracking-wide py-2 px-4 text-slate-500 hover:text-slate-700 transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                setShowLoginModal(true);
                setShowMobileNav(false);
              }}
              className="w-full text-base font-black uppercase tracking-wide text-white bg-slate-900 hover:bg-slate-700 transition-all px-6 py-3 rounded-lg"
            >
              Log in
            </button>
          )}
        </div>
      </div>

      {/* LOGIN MODAL OVERLAY */}
      {showLoginModal && (
        <LoginModal 
          onLogin={handleLogin} 
          onGuest={() => {
            setShowLoginModal(false);
            setPendingAction(null);
          }}
          isProfileTarget={currentView === 'Profile'}
        />
      )}

      {/* EVENT DETAIL MODAL OVERLAY */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          isLoggedIn={isLoggedIn}
          onTriggerLogin={() => triggerLoginForReserve(selectedEvent)}
          reservedEvents={reservedEvents}
          onToggleReserve={toggleReserve}
          onNavigateToRoom={eventSource === 'Event' ? (location) => {
            // 从location中提取房间号，例如 "Room 01, VoltLab" -> "R-01"
            const roomMatch = location.match(/Room\s+(\d+)/i);
            if (roomMatch) {
              const roomNumber = roomMatch[1]; // 提取房间号，如"01"
              const formattedRoomId = `R-${roomNumber.padStart(2, '0')}`; // 转换为"R-01"格式
              setTargetRoomId(formattedRoomId);
              setCurrentCategory('Navigation');
              setSelectedEvent(null); // 关闭模态框
            }
          } : undefined}
        />
      )}

      {/* RESERVE SUCCESS NOTIFICATION */}
      {showReserveSuccess && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[9999] animate-in">
          <div className="bg-green-600 text-white px-8 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-lg font-bold uppercase tracking-wider">Reservation Successful!</span>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-in-from-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .slide-in-from-bottom-4 { animation: slide-in-from-bottom 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .slide-in-from-right { animation: slide-in-from-right 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .-translate-y-full { transform: translateY(-100%); }
        .translate-y-0 { transform: translateY(0); }
        .transition-transform { transition: transform 0.7s cubic-bezier(0.7,0,0.3,1); }
      `}</style>
    </div>
  );
};

export default App;

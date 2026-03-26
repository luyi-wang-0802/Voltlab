import React, { useState, useEffect } from 'react';
import EmojiReactionsBar from './EmojiReactionsBar.tsx';
import { EventData } from './EventDetailModal';

type Tab = 'MY EVENTS' | 'SEAT BOOKINGS' | 'ROOM BOOKINGS';
type FilterType = 'All' | 'ACADEMIC' | 'CULTURE' | 'SOCIAL';

interface ProfileProps {
  userName: string;
  onClose: () => void;
  reservedEvents: EventData[];
  onExploreEvents: () => void;
  initialTab?: Tab;
  onSelectEvent?: (event: EventData) => void;
}

interface SeatBooking {
  id: string;
  date: string;
  day: string;
  time: string;
  seat: string;
  location: string;
  status: string;
}

interface RoomBooking {
  id: string;
  date: string;
  day: string;
  time: string;
  room: string;
  location: string;
  status: string;
  activity_title: string;
}

const API_BASE_URL = 'http://10.181.189.220:8000';

const Profile: React.FC<ProfileProps> = ({ 
  userName, 
  onClose, 
  reservedEvents, 
  onExploreEvents, 
  initialTab = 'MY EVENTS', 
  onSelectEvent 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  
  // New: Data fetched from backend
  const [seatBookings, setSeatBookings] = useState<SeatBooking[]>([]);
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [isLoadingSeat, setIsLoadingSeat] = useState(false);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [errorSeat, setErrorSeat] = useState<string | null>(null);
  const [errorRoom, setErrorRoom] = useState<string | null>(null);

  // Listen for initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Get seat bookings
  useEffect(() => {
    if (activeTab === 'SEAT BOOKINGS') {
      fetchSeatBookings();
    }
  }, [activeTab]);

  // Get room bookings
  useEffect(() => {
    if (activeTab === 'ROOM BOOKINGS') {
      fetchRoomBookings();
    }
  }, [activeTab]);

  const fetchSeatBookings = async () => {
    try {
      setIsLoadingSeat(true);
      setErrorSeat(null);
      
      // Get sessionId from localStorage (consistent with BookingExperience)
      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        setErrorSeat('Please log in first.');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/profile/seat-bookings`, {
        headers: {
          'X-Session-id': sessionId,  // ← Passed through Header
        },
      });
      
      if (response.status === 401) {
        setErrorSeat('Session expired. Please log in again.');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSeatBookings(data);
    } catch (err) {
      console.error('Error fetching seat bookings:', err);
      setErrorSeat('Failed to load seat bookings.');
    } finally {
      setIsLoadingSeat(false);
    }
  };

  const fetchRoomBookings = async () => {
    try {
      setIsLoadingRoom(true);
      setErrorRoom(null);
      
      // Get sessionId from localStorage (consistent with BookingExperience)
      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        setErrorRoom('Please log in first.');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/profile/room-bookings`, {
        headers: {
          'X-Session-id': sessionId,  // ← Passed through Header
        },
      });
        
      if (response.status === 401) {
        setErrorRoom('Session expired. Please log in again.');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRoomBookings(data);
    } catch (err) {
      console.error('Error fetching room bookings:', err);
      setErrorRoom('Failed to load room bookings.');
    } finally {
      setIsLoadingRoom(false);
    }
  };

  const filteredActivities = reservedEvents.filter(act => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'ACADEMIC') return act.category === 'ACADEMIC';
    if (activeFilter === 'CULTURE') return act.category === 'CULTURE';
    if (activeFilter === 'SOCIAL') return act.category === 'SOCIAL';
    return false;
  });

  return (
    <div className="w-full h-full bg-white overflow-y-auto overflow-x-hidden px-2 sm:px-6 md:px-10 py-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-6xl mx-auto">
        <div style={{ height: '120px' }} />
        
        {/* Header */}
        <header className="mb-12 flex flex-col items-center justify-center">
          {userName ? (
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg mb-6 bg-gray-200 flex items-center justify-center select-none" style={{ marginTop: '-60px' }}>
              <span className="text-6xl text-blue-500 font-bold">
                {userName[0].toUpperCase()}
              </span>
            </div>
          ) : (
            <img
              src="public/storytelling/image-w856.jpg"
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg mb-6"
              style={{ marginTop: '-60px' }}
            />
          )}
          <h1 className="text-6xl font-black tracking-normal uppercase mb-4 text-slate-900 leading-none">
            {userName || 'Guest Profile'}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold mb-8">
            Student Campus Access Verified
          </p>
        </header>

        {/* Tab Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 w-full">
          {(['MY EVENTS', 'SEAT BOOKINGS', 'ROOM BOOKINGS'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 border-2 uppercase tracking-wider
                border-blue-500
                ${activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-black hover:bg-blue-50'}
              `}
              style={{ minWidth: 120, maxWidth: '100%' }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="min-h-[600px] pb-32">
          {/* MY EVENTS Tab */}
          {activeTab === 'MY EVENTS' && (
            <div className="space-y-12">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {filteredActivities.length > 0 && filteredActivities.map((act, i) => (
                  <div
                    key={i}
                    onClick={() => onSelectEvent && onSelectEvent(act)}
                    className={`bg-white border-2 cursor-pointer group ${
                      act.category === 'ACADEMIC' ? 'border-blue-600' :
                      act.category === 'CULTURE' ? 'border-orange-500' :
                      'border-gray-500'
                    }`}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                      <img
                        src={act.url}
                        alt={act.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="p-3 pb-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {act.category || 'EVENT'}
                        </span>
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-tight leading-tight">
                        {act.title}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase text-slate-600">
                          {act.date} {act.time}
                        </p>
                        <p className="text-[11px] font-bold uppercase text-slate-600">
                          {act.location}
                        </p>
                      </div>
                      <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent && onSelectEvent(act);
                          }}
                          className={`px-4 py-1.5 bg-white text-slate-900 border border-slate-900 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 ${
                            act.category === 'ACADEMIC' ? 'hover:bg-blue-600 hover:text-white hover:border-white' :
                            act.category === 'CULTURE' ? 'hover:bg-orange-500 hover:text-white hover:border-white' :
                            'hover:bg-gray-500 hover:text-white hover:border-white'
                          }`}
                        >
                          DETAILS
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Past Events */}
                <div className="bg-white border-2 cursor-pointer group border-blue-600 w-full">
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                    <img
                      src="/storytelling/poster1_pastevents.jpg"
                      alt="Past Event 1"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-60"
                    />
                  </div>
                  <div className="p-3 pb-2 space-y-2 flex-1 flex flex-col w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">PAST EVENT</span>
                    <h3 className="text-sm font-black uppercase tracking-tight leading-tight">Prop Connect Expo</h3>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold uppercase text-slate-600">22 AUGUST 2025 AT 18:00</p>
                      <p className="text-[11px] font-bold uppercase text-slate-600">Main Hall, VoltLab</p>
                    </div>
                  </div>
                  <div className="w-full flex items-center justify-center py-0 overflow-hidden px-2">
                    <div className="w-full max-w-full flex items-center justify-center overflow-hidden">
                      <EmojiReactionsBar />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border-2 cursor-pointer group border-orange-500 w-full">
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                    <img
                      src="/storytelling/poster2_pastevents.jpg"
                      alt="Past Event 2"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-60"
                    />
                  </div>
                  <div className="p-3 pb-2 space-y-2 flex-1 flex flex-col w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">PAST EVENT</span>
                    <h3 className="text-sm font-black uppercase tracking-tight leading-tight">Bay Area Gold Group Limited</h3>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold uppercase text-slate-600">24 SEPTEMBER 2024 AT 15:00</p>
                      <p className="text-[11px] font-bold uppercase text-slate-600">Outdoor Area, VoltLab</p>
                    </div>
                  </div>
                  <div className="w-full flex items-center justify-center py-0 overflow-hidden px-2">
                    <div className="w-full max-w-full flex items-center justify-center overflow-hidden">
                      <EmojiReactionsBar />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEAT BOOKINGS Tab */}
          {activeTab === 'SEAT BOOKINGS' && (
            <div className="space-y-6">
              {isLoadingSeat ? (
                <div className="py-24 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
                  <p className="mt-4 text-sm font-bold uppercase text-slate-600">Loading...</p>
                </div>
              ) : errorSeat ? (
                <div className="py-24 text-center border border-dashed border-red-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500">{errorSeat}</p>
                </div>
              ) : seatBookings.length > 0 ? (
                seatBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="group bg-white border border-slate-100 hover:border-blue-600 p-12 flex items-center justify-between transition-all duration-500"
                  >
                    <div className="flex items-center space-x-20">
                      <div className="text-center w-28">
                        <span className="block text-5xl font-black text-slate-900 tracking-normal leading-none">
                          {booking.date.split(' ')[1]}
                        </span>
                        <span className="block text-[11px] uppercase font-black text-slate-400 tracking-[0.18em] mt-4">
                          {booking.date.split(' ')[0]}
                        </span>
                      </div>
                      <div className="h-16 w-[1.5px] bg-slate-50" />
                      <div>
                        <p className="text-[11px] uppercase font-black text-blue-600 tracking-[0.18em] mb-3">
                          {booking.time}
                        </p>
                        <h4 className="text-2xl font-black text-slate-900 uppercase tracking-normal mb-2">
                          {booking.seat} NODE
                        </h4>
                        <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em] font-bold">
                          {booking.location}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] px-6 py-2 bg-slate-900 text-white">
                      {booking.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center border border-dashed border-slate-50">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                    Zero active allocations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ROOM BOOKINGS Tab */}
          {activeTab === 'ROOM BOOKINGS' && (
            <div className="space-y-6">
              {isLoadingRoom ? (
                <div className="py-24 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
                  <p className="mt-4 text-sm font-bold uppercase text-slate-600">Loading...</p>
                </div>
              ) : errorRoom ? (
                <div className="py-24 text-center border border-dashed border-red-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500">{errorRoom}</p>
                </div>
              ) : roomBookings.length > 0 ? (
                roomBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="group bg-white border border-slate-100 hover:border-blue-600 p-12 flex items-center justify-between transition-all duration-500"
                  >
                    <div className="flex items-center space-x-20">
                      <div className="text-center w-28">
                        <span className="block text-5xl font-black text-slate-900 tracking-normal leading-none">
                          {booking.date.split(' ')[1]}
                        </span>
                        <span className="block text-[11px] uppercase font-black text-slate-400 tracking-[0.18em] mt-4">
                          {booking.date.split(' ')[0]}
                        </span>
                      </div>
                      <div className="h-16 w-[1.5px] bg-slate-50" />
                      <div>
                        <p className="text-[11px] uppercase font-black text-blue-600 tracking-[0.18em] mb-3">
                          {booking.time}
                        </p>
                        <h4 className="text-2xl font-black text-slate-900 uppercase tracking-normal mb-2">
                          {booking.room}
                        </h4>
                        <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em] font-bold">
                          {booking.location}
                        </p>
                        {booking.activity_title && (
                          <p className="text-[10px] text-slate-500 mt-2 font-medium">
                            {booking.activity_title}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] px-6 py-2 bg-slate-900 text-white">
                      {booking.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center border border-dashed border-slate-50">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                    Zero active allocations.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
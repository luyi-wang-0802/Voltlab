import React from 'react';

// Room name formatting helper
const ROOM_NAME_REGEX = /^R-\d{2}$/i;
const formatRoomName = (roomName: string): string => {
  if (ROOM_NAME_REGEX.test(roomName)) {
    const roomNumber = roomName.split('-')[1];
    return `Room ${roomNumber}`;
  }
  return roomName;
};

export interface EventData {
  url: string;
  title: string;
  description: string;
  slogan: string;  
  floor: number;
  category?: string;
  date?: string;
  time?: string;
  location?: string;
}

interface EventDetailModalProps {
  event: EventData;
  onClose: () => void;
  isLoggedIn: boolean;
  onTriggerLogin: () => void;
  reservedEvents: EventData[];
  onToggleReserve: (event: EventData) => void;
  onNavigateToRoom?: (location: string) => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ 
  event, 
  onClose, 
  isLoggedIn, 
  onTriggerLogin, 
  reservedEvents, 
  onToggleReserve, 
  onNavigateToRoom 
}) => {
  const isReserved = reservedEvents.some(e => e.title === event.title);

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleReserveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onTriggerLogin();
    } else {
      onToggleReserve(event);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-slate-900/70 cursor-pointer" onClick={handleClose} />
      
      <div 
        className="relative w-full max-w-5xl shadow-[0_80px_200px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-4 duration-1000"
        onClick={handleContainerClick}
      >
        <button 
          onClick={handleClose}
          className="absolute top-8 right-8 z-10 w-12 h-12 flex items-center justify-center bg-white border border-slate-50 hover:bg-slate-900 hover:text-white transition-all duration-300 shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-full md:w-1/2 relative overflow-hidden bg-black">
          <div className="aspect-[4/5] w-full">
            <img src={event.url} alt={event.title} className="w-full h-full object-cover animate-in zoom-in duration-1000" />
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          {event.category && (
            <h2 className="text-[11px] font-black uppercase tracking-[0.04em] text-slate-500 mb-4">{event.category} EVENT</h2>
          )}
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-normal text-slate-900 leading-[0.9] mb-5">{event.title}</h1>
          <div className="w-20 h-[1.5px] bg-blue-600 mb-6"></div>
          
          {/* slogan */}
          <p className="text-[14px] text-slate-500 leading-relaxed font-medium antialiased tracking-normal mb-6">
            {event.slogan || event.description}
          </p>
          
          <div className="space-y-3 mb-8">
            {event.date && event.time && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-slate-700">{event.date} {event.time}</span>
              </div>
            )}
            {event.location && (() => {
              const parts = event.location.split(', ');
              const roomPart = parts[0]; // "Room R-01"
              const venuePart = parts[1]; // "VoltLab"
              
              const formattedRoomPart = roomPart.replace(/Room (R-\d{2})/, (match, roomId) => formatRoomName(roomId));
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-slate-700">{formattedRoomPart}</span>
                  </div>
                  {venuePart && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-slate-700">{venuePart}</span>
                    </div>
                  )}
                  {onNavigateToRoom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToRoom(event.location);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.05em] hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 013.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      HOW TO GET THERE
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          <button 
            onClick={handleReserveClick}
            className={`w-full py-4 text-[11px] font-black uppercase tracking-[0.05em] transition-all duration-300 flex items-center justify-center gap-2 ${
              isReserved 
                ? 'bg-slate-900 text-white border-2 border-slate-900' 
                : 'bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white'
            }`}
          >
            {isReserved ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                RESERVED
              </>
            ) : (
              <>
                RESERVE NOW
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
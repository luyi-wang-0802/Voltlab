import React, { useState, useEffect, useRef } from 'react';
import { EventData } from './EventDetailModal';
import { EventFilter } from '../App';
import Lenis from 'lenis';

// Room name formatting helper
const ROOM_NAME_REGEX = /^R-\d{2}$/i;
const formatRoomName = (roomName: string): string => {
  if (ROOM_NAME_REGEX.test(roomName)) {
    const roomNumber = roomName.split('-')[1];
    return `Room ${roomNumber}`;
  }
  return roomName;
};

interface ExperienceProps {
  isExploded: boolean;
  focusedFloor: number | null;
  hoveredFloor: number | null;
  onSelectFloor: (index: number) => void;
  onSelectEvent: (event: EventData) => void;
  isModalOpen: boolean;
  eventFilter: EventFilter;
  reservedEventTitles: string[];
  onScroll?: (scrolled: boolean) => void;
  onReserveClick: (event: Event) => void;
}

type EventCategory = 'ACADEMIC' | 'CULTURE' | 'SOCIAL';

interface Event {
  id: number;
  category: EventCategory;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  imageUrl: string;
  month: number;
  description: string;
  slogan: string;
  year: number;
}

// ========== Timezone conversion utility functions (for data processing only) ==========
const convertUTCtoGermanyTime = (utcDateStr: string): Date => {
  const utcDate = new Date(utcDateStr);
  return new Date(utcDate.getTime() + 60 * 60 * 1000); // +1 hour
};

const formatDateForGermany = (utcDateStr: string): string => {
  const germanyTime = convertUTCtoGermanyTime(utcDateStr);
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const day = germanyTime.getDate();
  const month = monthNames[germanyTime.getMonth()];
  const year = germanyTime.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatTimeForGermany = (utcDateStr: string): string => {
  const germanyTime = convertUTCtoGermanyTime(utcDateStr);
  let hour = germanyTime.getHours();
  const minute = germanyTime.getMinutes();
  const amPm = hour < 12 ? 'AM' : 'PM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `AT ${hour}:${minute.toString().padStart(2, '0')} ${amPm}`;
};

const getMonthForGermany = (utcDateStr: string): number => {
  const germanyTime = convertUTCtoGermanyTime(utcDateStr);
  return germanyTime.getMonth() + 1;
};
// ========== End of timezone conversion utility functions ==========

const Experience: React.FC<ExperienceProps> = ({ 
  isExploded, 
  focusedFloor, 
  hoveredFloor, 
  onSelectFloor, 
  onSelectEvent, 
  isModalOpen, 
  eventFilter, 
  reservedEventTitles,
  onScroll,
  onReserveClick
}) => {
  // View mode: Poster grid
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(2);
  const [selectedYear, setSelectedYear] = useState<number>(2026); // New: Selected year
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [visiblePosters, setVisiblePosters] = useState<Set<number>>(new Set());
  const [animationCompleted, setAnimationCompleted] = useState<Set<number>>(new Set());
  const posterRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // Changed to string key: "YYYY-MM"
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ========== New: Fetch data from backend ==========
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('http://10.181.189.220:8000/api/events');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert backend data to frontend format
        const formattedEvents: Event[] = data.map((event: any) => ({
          id: event.id,
          category: (event.category || 'SOCIAL') as EventCategory,
          title: event.activity_title,
          date: formatDateForGermany(event.start_time_utc),
          time: formatTimeForGermany(event.start_time_utc),
          month: getMonthForGermany(event.start_time_utc),
          year: convertUTCtoGermanyTime(event.start_time_utc).getFullYear(),
          location: `${event.ifcroom_id ? formatRoomName(event.ifcroom_id) : 'Room TBD'}, VoltLab`,
          price: 'Free',
          imageUrl: event.poster_url ? `http://10.181.189.220:8000${event.poster_url}` : '',
          description: event.slogan,
          slogan: event.slogan,
        }));
        
        setAllEvents(formattedEvents);
        
        if (formattedEvents.length > 0) {
          setSelectedMonth(formattedEvents[0].month);
          setSelectedYear(formattedEvents[0].year);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);
  // ========== End of data fetching ==========

  // ========== Dynamically generate month list ==========
  const getAvailableMonths = () => {
    const monthYearSet = new Set<string>();
    
    allEvents.forEach(event => {
      const germanyTime = convertUTCtoGermanyTime(event.date);
      const year = germanyTime.getFullYear();
      const month = germanyTime.getMonth() + 1;
      monthYearSet.add(`${year}-${month}`);
    });

    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];

    return Array.from(monthYearSet)
      .sort()
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return {
          key,
          year,
          month,
          label: `${monthNames[month - 1]} ${String(year).slice(-2)}`
        };
      });
  };

  const availableMonths = getAvailableMonths();
  // ========== End of dynamic month list ==========

  // Initialize selection to the first month with activities
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].month);
      setSelectedYear(availableMonths[0].year);
    }
  }, [allEvents]);

  // Filter events (unchanged logic)
  const filteredEvents = allEvents
    .filter(event => {
      const matchesCategory = selectedCategory === null || event.category === selectedCategory;
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split(' ');
        return new Date(`${month} ${day}, ${year}`);
      };
      return parseDate(a.date).getTime() - parseDate(b.date).getTime();
    });

  // ========== Group events by year-month ==========
  const eventsByYearMonth = filteredEvents.reduce((acc, event) => {
    const germanyTime = convertUTCtoGermanyTime(event.date);
    const year = germanyTime.getFullYear();
    const month = germanyTime.getMonth() + 1;
    const key = `${year}-${month}`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const sortedYearMonths = Object.keys(eventsByYearMonth).sort();
  // ========== End of grouping ==========

  // Reset animation state when switching categories (unchanged)
  useEffect(() => {
    setVisiblePosters(new Set());
    setAnimationCompleted(new Set());
    posterRefs.current.clear();
  }, [selectedCategory]);

  // Use Intersection Observer to detect posters entering viewport (unchanged)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-event-id'));
            setVisiblePosters((prev) => new Set(prev).add(id));
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px'
      }
    );

    const timer = setTimeout(() => {
      posterRefs.current.forEach((el) => {
        observer.observe(el);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [filteredEvents]);

  // ========== Integrated scroll monitoring: Handle both month switching and scroll callback ==========
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Get container top position
          const containerTop = container.getBoundingClientRect().top;

          let closestYearMonth: string | null = null;
          let minDistance = Infinity;

          monthRefs.current.forEach((element, yearMonthKey) => {
            const rect = element.getBoundingClientRect();
            // Calculate distance from month marker to container top
            const distance = Math.abs(rect.top - containerTop - 200);
            
            // Only consider months that have been scrolled to or are near the viewport
            if (rect.top - containerTop <= 250 && distance < minDistance) {
              minDistance = distance;
              closestYearMonth = yearMonthKey;
            }
          });

          // Update selected month
          if (closestYearMonth) {
            const [year, month] = closestYearMonth.split('-').map(Number);
            if (selectedYear !== year || selectedMonth !== month) {
              setSelectedYear(year);
              setSelectedMonth(month);
            }
          }

          // Original scroll callback
          if (onScroll) {
            onScroll(container.scrollTop > 10);
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Execute once on initialization
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [filteredEvents, selectedYear, selectedMonth, onScroll]);
  // ========== End of integrated scroll monitoring ==========

  // Lenis smooth scrolling (unchanged)
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      content: scrollContainerRef.current.firstElementChild as HTMLElement,
      duration: 1.2,
      lerp: 0.12,
      smoothWheel: true,
      syncTouch: false,
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      touchMultiplier: 1,
      infinite: false,
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => {
      lenis.destroy();
    };
  }, []);

  // ========== Loading and error states ==========
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.05em] text-slate-600">Loading Events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white">
        <div className="text-center">
          <p className="text-red-600 font-bold uppercase tracking-[0.05em] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.05em] hover:bg-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white">
        <div className="text-center">
          <p className="text-slate-500 font-medium">No events available at the moment.</p>
        </div>
      </div>
    );
  }
  // ========== End of state handling ==========

  // ========== Get display text for currently selected month ==========
  const getCurrentMonthLabel = () => {
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return `${monthNames[selectedMonth - 1]} ${String(selectedYear).slice(-2)}`;
  };
  // ==========

  return (
    <div className="relative w-full h-full bg-white overflow-x-hidden">
      {/* Fixed Month selector - Top right month selector */}
      <div className="fixed top-24 md:top-32 right-4 md:right-12 z-50">
        <button 
          onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
          className="flex items-center gap-2 md:gap-3 hover:opacity-70 transition-opacity"
        >
          <span 
            key={`${selectedYear}-${selectedMonth}`}
            className="text-sm md:text-2xl font-black uppercase tracking-[0.05em] text-slate-900 animate-slideDown"
          >
            {getCurrentMonthLabel()}
          </span>
          <svg className={`w-4 h-4 md:w-6 md:h-6 transition-transform ${
            isMonthDropdownOpen ? 'rotate-180' : ''
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isMonthDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-40 md:w-48 bg-white border-2 border-slate-900 shadow-xl z-50 max-h-80 overflow-y-auto">
            {availableMonths.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  const monthSection = monthRefs.current.get(item.key);
                  const container = scrollContainerRef.current;
                  
                  if (monthSection && container) {
                    const containerRect = container.getBoundingClientRect();
                    const monthRect = monthSection.getBoundingClientRect();
                    const targetScroll = container.scrollTop + monthRect.top - containerRect.top - 200;
                    
                    container.scrollTo({
                      top: targetScroll,
                      behavior: 'smooth'
                    });
                  }
                  setIsMonthDropdownOpen(false);
                }}
                className={`w-full px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-black uppercase tracking-[0.05em] transition-colors ${
                  selectedMonth === item.month && selectedYear === item.year
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Poster grid view */}
      <div ref={scrollContainerRef} className="w-full h-full overflow-y-auto overflow-x-hidden bg-white pt-24">
        <div className="w-full px-4 md:pl-12 md:pr-10 py-6">
          {/* Top control bar - Filter and search bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center mb-8 gap-3 md:gap-4">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* All events button */}
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex border overflow-hidden transition-all ${
                  selectedCategory === null ? 'border-white' : 'border-slate-900'
                }`}
              >
                <div className={`px-3 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-[0.05em] ${
                  selectedCategory === null ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                }`}>
                  ALL EVENTS
                </div>
                <div className={`px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-black border-l ${
                  selectedCategory === null 
                    ? 'bg-slate-900 text-white border-white' 
                    : 'bg-white text-slate-900 border-slate-900'
                }`}>
                  {allEvents.length.toString().padStart(2, '0')}
                </div>
              </button>
              
              {/* Category buttons */}
              {(['ACADEMIC', 'CULTURE', 'SOCIAL'] as EventCategory[]).map((category) => {
                const getColor = () => {
                  if (category === 'ACADEMIC') return 'bg-blue-600';
                  if (category === 'CULTURE') return 'bg-orange-500';
                  return 'bg-gray-500';
                };
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex border overflow-hidden transition-all ${
                      selectedCategory === category ? 'border-white' : 'border-slate-900'
                    }`}
                  >
                    <div className={`px-3 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-[0.05em] ${
                      selectedCategory === category ? `${getColor()} text-white` : 'bg-white text-slate-700'
                    }`}>
                      {category}
                    </div>
                    <div className={`px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-black border-l ${
                      selectedCategory === category 
                        ? `${getColor()} text-white border-white` 
                        : 'bg-white text-slate-900 border-slate-900'
                    }`}>
                      {allEvents.filter(e => e.category === category).length.toString().padStart(2, '0')}
                    </div>
                  </button>
                );
              })}
            </div>
              
            {/* Search bar */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH AN EVENT"
                className="w-full px-4 py-2 md:py-2.5 border-2 border-slate-900 text-[10px] md:text-xs font-bold uppercase tracking-[0.05em] focus:outline-none focus:border-blue-600"
              />
              <button className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Poster grid grouped by year-month */}
          <div className="space-y-12 md:space-y-24">
            {sortedYearMonths.map((yearMonthKey) => {
              const [year, month] = yearMonthKey.split('-').map(Number);
              
              return (
                <div 
                  key={yearMonthKey}
                  className="relative"
                >
                  {/* Month marker element - Position adjustment */}
                  <div 
                    data-year-month={yearMonthKey}
                    ref={(el) => {
                      if (el) monthRefs.current.set(yearMonthKey, el);
                    }}
                    className="absolute -top-32 left-0 w-full h-px pointer-events-none"
                  />

                  {/* Events grid for this year-month */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-12">
                    {eventsByYearMonth[yearMonthKey].map((event) => (
                      <div
                        key={event.id}
                        data-event-id={event.id}
                        ref={(el) => {
                          if (el) posterRefs.current.set(event.id, el);
                        }}
                        onClick={() => {
                          onSelectEvent({
                            url: event.imageUrl,
                            title: event.title,
                            description: event.slogan,
                            slogan: event.slogan,
                            floor: 1,
                            category: event.category,
                            date: event.date,
                            time: event.time,
                            location: event.location
                          });
                        }}
                        className={`bg-white border cursor-pointer group overflow-hidden ${
                          event.category === 'ACADEMIC' ? 'border-blue-600' :
                          event.category === 'CULTURE' ? 'border-orange-500' :
                          'border-gray-500'
                        }`}
                      >
                        {/* Poster image */}
                        <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className={`w-full h-full object-cover transition-all ${
                              visiblePosters.has(event.id) 
                                ? 'translate-y-0 opacity-100 duration-[1200ms]' 
                                : '-translate-y-full opacity-0'
                            } ${
                              animationCompleted.has(event.id) ? 'group-hover:scale-110 group-hover:duration-300' : ''
                            }`}
                            onTransitionEnd={() => {
                              if (visiblePosters.has(event.id)) {
                                setAnimationCompleted((prev) => new Set(prev).add(event.id));
                              }
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Event info */}
                        <div className="p-3 md:p-4 space-y-1.5 md:space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.05em] text-slate-500">
                              {event.category}
                            </span>
                          </div>

                          <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.1em] leading-tight">
                            {event.title}
                          </h3>

                          <div className="space-y-1">
                            <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-[0.05em] text-slate-600">
                              {event.date} {event.time}
                            </p>
                            <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-[0.05em] text-slate-600">
                              {event.location}
                            </p>
                          </div>

                          <div className="flex items-center justify-end pt-1.5 md:pt-2 border-t border-slate-100">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectEvent({
                                  url: event.imageUrl,
                                  title: event.title,
                                  description: event.slogan,
                                  slogan: event.slogan,
                                  floor: 1,
                                  category: event.category,
                                  date: event.date,
                                  time: event.time,
                                  location: event.location
                                });
                              }}
                              className={`px-3 md:px-4 py-1 md:py-1.5 bg-white text-slate-900 border border-slate-900 text-[9px] md:text-[10px] font-black uppercase tracking-[0.05em] transition-colors flex items-center gap-1 ${
                                event.category === 'ACADEMIC' ? 'hover:bg-blue-600 hover:text-white hover:border-white' :
                                event.category === 'CULTURE' ? 'hover:bg-orange-500 hover:text-white hover:border-white' :
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
                  </div>
                </div>
              );
            })}
          </div>

          {/* No results message */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 text-sm font-medium">No events found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add CSS animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
      `}} />
    </div>
  );
};

export default Experience;
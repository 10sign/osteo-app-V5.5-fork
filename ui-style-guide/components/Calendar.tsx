import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endTime?: Date;
  type?: string;
  color?: string;
}

export interface CalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  view: 'day' | 'week' | 'month';
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  className?: string;
}

const Calendar: React.FC<CalendarProps> = ({
  events,
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onEventClick,
  onTimeSlotClick,
  className = "",
}) => {
  // Time slots for day/week view (8 AM to 6 PM)
  const timeSlots = Array.from({ length: 11 }, (_, i) => i + 8);

  const formatTime = (hour: number) => `${hour}:00`;

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    onDateChange(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    onDateChange(newDate);
  };

  const getEventsForTimeSlot = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.toDateString() === date.toDateString() &&
        eventDate.getHours() === hour
      );
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'Première consultation':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Consultation urgence':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Consultation enfant':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-primary-100 text-primary-800 border-primary-200';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            leftIcon={<ChevronLeft size={16} />}
          >
            Précédent
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDateChange(new Date())}
          >
            Aujourd'hui
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            rightIcon={<ChevronRight size={16} />}
          >
            Suivant
          </Button>
        </div>
        
        <h2 className="text-lg font-medium text-gray-900">
          {currentDate.toLocaleDateString('fr-FR', { 
            month: 'long', 
            year: 'numeric',
            ...(view === 'day' && { day: 'numeric', weekday: 'long' })
          })}
        </h2>
        
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((viewType) => (
            <button
              key={viewType}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                view === viewType 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => onViewChange(viewType)}
            >
              {viewType === 'day' ? 'Jour' : viewType === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'week' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="py-4 px-2 text-center bg-gray-50"></div>
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(currentDate);
              const startOfWeek = date.getDate() - date.getDay() + 1 + i;
              date.setDate(startOfWeek);
              
              return (
                <div 
                  key={i} 
                  className={`py-4 px-2 text-center border-l border-gray-200 ${
                    date.toDateString() === new Date().toDateString() ? 'bg-primary-50' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {date.toLocaleDateString('fr-FR', { weekday: 'long' })}
                  </p>
                  <p className={`text-2xl font-bold ${
                    date.toDateString() === new Date().toDateString() ? 'text-primary-600' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Time slots */}
          {timeSlots.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="py-3 px-2 text-center text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                {formatTime(hour)}
              </div>
              
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const date = new Date(currentDate);
                const startOfWeek = date.getDate() - date.getDay() + 1 + dayIndex;
                date.setDate(startOfWeek);
                
                const slotEvents = getEventsForTimeSlot(date, hour);
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`relative h-16 border-l border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                      date.toDateString() === new Date().toDateString() ? 'bg-primary-50/30' : ''
                    }`}
                    onClick={() => onTimeSlotClick?.(date, hour)}
                  >
                    {slotEvents.map((event) => (
                      <div 
                        key={event.id}
                        className={`absolute inset-1 rounded-lg p-2 text-xs border cursor-pointer hover:shadow-md transition-shadow ${getEventColor(event)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-xs opacity-75 truncate">
                          {formatTime(hour)} - {event.endTime ? formatTime(event.endTime.getHours()) : formatTime(hour + 1)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

export default Calendar;
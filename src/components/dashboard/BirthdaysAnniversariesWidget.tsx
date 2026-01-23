import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameMonth, isSameDay, addDays, isAfter, isBefore, setYear } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface CelebrationEvent {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  date: Date;
  type: "birthday" | "anniversary";
  years?: number;
}

export function BirthdaysAnniversariesWidget() {
  const [events, setEvents] = useState<CelebrationEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (events.length <= 4) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, events.length - 3));
    }, 4000);
    
    return () => clearInterval(interval);
  }, [events.length]);

  const fetchUpcomingEvents = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, date_of_birth, date_hired")
        .eq("is_active", true);

      if (error) throw error;

      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);
      const currentYear = today.getFullYear();
      const upcomingEvents: CelebrationEvent[] = [];

      profiles?.forEach((profile) => {
        // Check birthday
        if (profile.date_of_birth) {
          const birthDate = new Date(profile.date_of_birth);
          const thisYearBirthday = setYear(birthDate, currentYear);
          
          // If birthday already passed this year, check next year
          const checkDate = isBefore(thisYearBirthday, today) 
            ? setYear(birthDate, currentYear + 1)
            : thisYearBirthday;

          if (isBefore(checkDate, thirtyDaysFromNow) || isSameDay(checkDate, today)) {
            upcomingEvents.push({
              id: `${profile.id}-birthday`,
              firstName: profile.first_name,
              lastName: profile.last_name,
              avatarUrl: profile.avatar_url,
              date: checkDate,
              type: "birthday",
            });
          }
        }

        // Check work anniversary
        if (profile.date_hired) {
          const hiredDate = new Date(profile.date_hired);
          const thisYearAnniversary = setYear(hiredDate, currentYear);
          
          // If anniversary already passed this year, check next year
          const checkDate = isBefore(thisYearAnniversary, today)
            ? setYear(hiredDate, currentYear + 1)
            : thisYearAnniversary;

          const years = checkDate.getFullYear() - hiredDate.getFullYear();
          
          if ((isBefore(checkDate, thirtyDaysFromNow) || isSameDay(checkDate, today)) && years > 0) {
            upcomingEvents.push({
              id: `${profile.id}-anniversary`,
              firstName: profile.first_name,
              lastName: profile.last_name,
              avatarUrl: profile.avatar_url,
              date: checkDate,
              type: "anniversary",
              years,
            });
          }
        }
      });

      // Sort by date
      upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      setEvents(upcomingEvents);
    } catch (error) {
      console.error("Error fetching celebrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PartyPopper className="h-5 w-5 text-primary" />
            Birthdays & Anniversaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PartyPopper className="h-5 w-5 text-primary" />
            Birthdays & Anniversaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No upcoming celebrations in the next 30 days
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleEvents = events.slice(currentIndex, currentIndex + 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PartyPopper className="h-5 w-5 text-primary" />
          Birthdays & Anniversaries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-4"
            animate={{ x: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <AnimatePresence mode="popLayout">
              {visibleEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 w-[140px]"
                >
                  <div
                    className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                      isToday(event.date)
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <Avatar className="h-14 w-14 mb-2">
                      <AvatarImage src={event.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(event.firstName, event.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm text-center truncate w-full">
                      {event.firstName} {event.lastName.charAt(0)}.
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {event.type === "birthday" ? (
                        <Cake className="h-4 w-4 text-pink-500" />
                      ) : (
                        <PartyPopper className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {isToday(event.date) ? "Today!" : format(event.date, "MMM d")}
                      </span>
                    </div>
                    {event.type === "anniversary" && event.years && (
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {event.years} year{event.years > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Navigation dots */}
          {events.length > 4 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {Array.from({ length: Math.ceil(events.length - 3) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

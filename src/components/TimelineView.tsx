import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth, getTrackingUserId } from '../lib/firebase';
import { startOfDay, format, eachHourOfInterval } from 'date-fns';

interface Feed {
  timestamp: Timestamp;
  type: 'maternal' | 'artificial';
  amount: number;
}

interface Sleep {
  startTime: Timestamp;
  endTime: Timestamp | null;
}

export function TimelineView() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [sleeps, setSleeps] = useState<Sleep[]>([]);
  const today = new Date();
  const hours = eachHourOfInterval({
    start: startOfDay(today),
    end: today
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchTimelineData = async () => {
      const trackingUserId = await getTrackingUserId();
      if (!trackingUserId) return;

      const startOfToday = startOfDay(new Date());
      
      const feedsQuery = query(
        collection(db, 'feeds'),
        where('userId', '==', trackingUserId),
        where('timestamp', '>=', startOfToday)
      );

      const sleepsQuery = query(
        collection(db, 'sleep'),
        where('userId', '==', trackingUserId),
        where('startTime', '>=', startOfToday)
      );

      try {
        const [feedsSnapshot, sleepsSnapshot] = await Promise.all([
          getDocs(feedsQuery),
          getDocs(sleepsQuery)
        ]);

        setFeeds(feedsSnapshot.docs.map(doc => doc.data() as Feed));
        setSleeps(sleepsSnapshot.docs.map(doc => doc.data() as Sleep));
      } catch (error) {
        console.error('Error fetching timeline data:', error);
      }
    };

    fetchTimelineData();
  }, []);

  const getTimePosition = (time: Date) => {
    const totalMinutes = time.getHours() * 60 + time.getMinutes();
    return (totalMinutes / (24 * 60)) * 100;
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Today's Timeline</h2>
      <div className="relative mt-8">
        {/* Timeline container */}
        <div className="h-20 bg-gray-50 rounded-lg relative">
          {/* Hour markers */}
          {[0, 6, 12, 18].map((hour) => (
            <div
              key={hour}
              className="absolute top-0 bottom-0 border-l border-gray-200"
              style={{ left: `${(hour / 24) * 100}%` }}
            >
              <span className="absolute -top-6 -translate-x-1/2 text-sm text-gray-500">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Sleep periods */}
          {sleeps.map((sleep, index) => {
            const startPos = getTimePosition(sleep.startTime.toDate());
            const endPos = sleep.endTime 
              ? getTimePosition(sleep.endTime.toDate())
              : getTimePosition(new Date());

            return (
              <div
                key={index}
                className="absolute top-2 bottom-2 bg-purple-200 rounded"
                style={{
                  left: `${startPos}%`,
                  width: `${endPos - startPos}%`
                }}
              />
            );
          })}

          {/* Feed indicators */}
          {feeds.map((feed, index) => {
            const position = getTimePosition(feed.timestamp.toDate());
            
            return (
              <div
                key={index}
                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
                  feed.type === 'maternal' ? 'bg-blue-500' : 'bg-green-500'
                } border-2 border-white`}
                style={{ left: `${position}%` }}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Maternal Feed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Artificial Feed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-200 rounded" />
            <span>Sleep Period</span>
          </div>
        </div>
      </div>
    </div>
  );
}
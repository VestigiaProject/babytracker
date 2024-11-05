import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, getTrackingUserId } from '../lib/firebase';
import { startOfDay, differenceInMinutes, formatDuration } from 'date-fns';
import { LineChart, Clock, Moon } from 'lucide-react';

export function Statistics() {
  const [averageFeedInterval, setAverageFeedInterval] = useState<string>('');
  const [averageWakeDuration, setAverageWakeDuration] = useState<string>('');
  const [averageSleepDuration, setAverageSleepDuration] = useState<string>('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchStatistics = async () => {
      const trackingUserId = await getTrackingUserId();
      if (!trackingUserId) return;

      const startOfToday = startOfDay(new Date());
      
      try {
        // Fetch feeds
        const feedsQuery = query(
          collection(db, 'feeds'),
          where('userId', '==', trackingUserId),
          where('timestamp', '>=', startOfToday)
        );
        
        // Fetch sleeps
        const sleepsQuery = query(
          collection(db, 'sleep'),
          where('userId', '==', trackingUserId),
          where('startTime', '>=', startOfToday)
        );

        const [feedsSnapshot, sleepsSnapshot] = await Promise.all([
          getDocs(feedsQuery),
          getDocs(sleepsQuery)
        ]);

        // Calculate feed intervals
        const feeds = feedsSnapshot.docs
          .map(doc => ({ timestamp: doc.data().timestamp }))
          .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

        if (feeds.length >= 2) {
          let totalInterval = 0;
          for (let i = 0; i < feeds.length - 1; i++) {
            const interval = differenceInMinutes(
              feeds[i].timestamp.toDate(),
              feeds[i + 1].timestamp.toDate()
            );
            totalInterval += interval;
          }
          const avgInterval = totalInterval / (feeds.length - 1);
          setAverageFeedInterval(formatDuration({ minutes: Math.round(avgInterval) }));
        }

        // Calculate sleep and wake durations
        const sleeps = sleepsSnapshot.docs
          .map(doc => ({
            startTime: doc.data().startTime,
            endTime: doc.data().endTime
          }))
          .filter(sleep => sleep.endTime) // Only consider completed sleep periods
          .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());

        if (sleeps.length > 0) {
          // Calculate average sleep duration
          let totalSleep = 0;
          sleeps.forEach(sleep => {
            const duration = differenceInMinutes(
              sleep.endTime.toDate(),
              sleep.startTime.toDate()
            );
            totalSleep += duration;
          });
          const avgSleep = totalSleep / sleeps.length;
          setAverageSleepDuration(formatDuration({ minutes: Math.round(avgSleep) }));

          // Calculate average wake duration
          if (sleeps.length >= 2) {
            let totalWake = 0;
            let wakeCount = 0;
            for (let i = 0; i < sleeps.length - 1; i++) {
              const wakeDuration = differenceInMinutes(
                sleeps[i].startTime.toDate(),
                sleeps[i + 1].endTime.toDate()
              );
              if (wakeDuration > 0) {
                totalWake += wakeDuration;
                wakeCount++;
              }
            }
            if (wakeCount > 0) {
              const avgWake = totalWake / wakeCount;
              setAverageWakeDuration(formatDuration({ minutes: Math.round(avgWake) }));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();
  }, []);

  if (!averageFeedInterval && !averageWakeDuration && !averageSleepDuration) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {averageFeedInterval && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-blue-500" size={20} />
            <h3 className="font-medium">Average Time Between Feeds</h3>
          </div>
          <p className="text-2xl font-semibold text-blue-600">{averageFeedInterval}</p>
        </div>
      )}
      
      {averageWakeDuration && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <LineChart className="text-green-500" size={20} />
            <h3 className="font-medium">Average Wake Duration</h3>
          </div>
          <p className="text-2xl font-semibold text-green-600">{averageWakeDuration}</p>
        </div>
      )}
      
      {averageSleepDuration && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="text-purple-500" size={20} />
            <h3 className="font-medium">Average Sleep Duration</h3>
          </div>
          <p className="text-2xl font-semibold text-purple-600">{averageSleepDuration}</p>
        </div>
      )}
    </div>
  );
}

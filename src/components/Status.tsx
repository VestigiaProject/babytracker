import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth, getTrackingUserId } from '../lib/firebase';
import { formatDistanceToNow, subHours } from 'date-fns';
import { Baby } from 'lucide-react';

interface Feed {
  timestamp: Timestamp;
  amount: number;
}

interface Sleep {
  startTime: Timestamp;
  endTime: Timestamp | null;
}

export function Status({ refreshTrigger = 0 }) {
  const [lastFeed, setLastFeed] = useState<Feed | null>(null);
  const [recentFeeds, setRecentFeeds] = useState<Feed[]>([]);
  const [lastSleep, setLastSleep] = useState<Sleep | null>(null);
  const [, setUpdateTrigger] = useState(0); // Force re-render for time updates

  const fetchData = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      const trackingUserId = await getTrackingUserId();
      if (!trackingUserId) return;

      // Get last feed
      const lastFeedQuery = query(
        collection(db, 'feeds'),
        where('userId', '==', trackingUserId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      // Get feeds in last 3 hours
      const threeHoursAgo = subHours(new Date(), 3);
      const recentFeedsQuery = query(
        collection(db, 'feeds'),
        where('userId', '==', trackingUserId),
        where('timestamp', '>=', threeHoursAgo)
      );

      // Get last sleep
      const lastSleepQuery = query(
        collection(db, 'sleep'),
        where('userId', '==', trackingUserId),
        orderBy('startTime', 'desc'),
        limit(1)
      );

      const [lastFeedSnap, recentFeedsSnap, lastSleepSnap] = await Promise.all([
        getDocs(lastFeedQuery),
        getDocs(recentFeedsQuery),
        getDocs(lastSleepQuery)
      ]);

      if (!lastFeedSnap.empty) {
        const feedData = lastFeedSnap.docs[0].data() as Feed;
        setLastFeed(feedData);
      }

      const recentFeedsData = recentFeedsSnap.docs.map(doc => doc.data() as Feed);
      setRecentFeeds(recentFeedsData);

      if (!lastSleepSnap.empty) {
        const sleepData = lastSleepSnap.docs[0].data() as Sleep;
        setLastSleep(sleepData);
      }
    } catch (error) {
      console.error('Error fetching status data:', error);
    }
  }, []);

  // Fetch data when refreshTrigger changes
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Update time displays frequently
  useEffect(() => {
    const timeUpdateInterval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1); // Force re-render to update time displays
    }, 1000); // Update every second
    return () => clearInterval(timeUpdateInterval);
  }, []);

  const totalRecentFeeds = recentFeeds.reduce((sum, feed) => sum + feed.amount, 0);
  
  const getLastFeedText = () => {
    if (!lastFeed) return 'has not eaten yet today';
    return `has last eaten ${formatDistanceToNow(lastFeed.timestamp.toDate(), { addSuffix: true })}`;
  };
  
  const getSleepStatus = () => {
    if (!lastSleep) return 'no sleep data available';
    
    if (!lastSleep.endTime) {
      return `asleep since ${formatDistanceToNow(lastSleep.startTime.toDate(), { addSuffix: true })}`;
    }
    
    if (lastSleep.endTime.toDate() > lastSleep.startTime.toDate()) {
      return `awake since ${formatDistanceToNow(lastSleep.endTime.toDate(), { addSuffix: true })}`;
    }
    
    return 'no recent sleep data';
  };

  if (!lastFeed && !lastSleep) return null;

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm mb-6">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Baby className="text-blue-500" size={20} />
        </div>
        <p className="text-gray-700 leading-relaxed">
          Baby {getLastFeedText()}. 
          In the last 3 hours, he has eaten <span className="font-medium">{totalRecentFeeds}ml</span>. 
          He is {getSleepStatus()}.
        </p>
      </div>
    </div>
  );
}
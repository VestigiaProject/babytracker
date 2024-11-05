import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, getTrackingUserId } from '../lib/firebase';
import { startOfDay } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface Feed {
  id: string;
  type: 'maternal' | 'artificial';
  amount: number;
  timestamp: Timestamp;
}

export function Summary({ refreshTrigger, onFeedDeleted }: { refreshTrigger?: number; onFeedDeleted?: () => void }) {
  const [summary, setSummary] = useState({
    maternal: 0,
    artificial: 0,
    total: 0,
  });
  const [recentFeeds, setRecentFeeds] = useState<Feed[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchTodayData = async () => {
      const trackingUserId = await getTrackingUserId();
      if (!trackingUserId) return;

      const startOfToday = startOfDay(new Date());
      
      const q = query(
        collection(db, 'feeds'),
        where('userId', '==', trackingUserId),
        where('timestamp', '>=', startOfToday),
        orderBy('timestamp', 'desc')
      );

      try {
        const querySnapshot = await getDocs(q);
        let maternal = 0;
        let artificial = 0;
        const feeds: Feed[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'maternal') maternal += data.amount;
          if (data.type === 'artificial') artificial += data.amount;
          feeds.push({ id: doc.id, ...data } as Feed);
        });

        setSummary({
          maternal,
          artificial,
          total: maternal + artificial,
        });
        setRecentFeeds(feeds);
      } catch (error) {
        console.error('Error fetching feeds:', error);
      }
    };

    fetchTodayData();
  }, [refreshTrigger]);

  const deleteFeed = async (feedId: string) => {
    if (!confirm('Are you sure you want to delete this feed?')) return;
    
    try {
      await deleteDoc(doc(db, 'feeds', feedId));
      onFeedDeleted?.();
    } catch (error) {
      console.error('Error deleting feed:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Today's Summary</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600">Maternal</div>
          <div className="text-2xl font-bold text-blue-700">{summary.maternal}ml</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600">Artificial</div>
          <div className="text-2xl font-bold text-green-700">{summary.artificial}ml</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600">Total</div>
          <div className="text-2xl font-bold text-purple-700">{summary.total}ml</div>
        </div>
      </div>

      <h3 className="font-medium mb-2">Recent Feeds</h3>
      {recentFeeds.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No feeds recorded today</p>
      ) : (
        <div className="space-y-2">
          {recentFeeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded group"
            >
              <span className={`font-medium ${
                feed.type === 'maternal' ? 'text-blue-600' : 'text-green-600'
              }`}>
                {feed.amount}ml {feed.type}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {feed.timestamp.toDate().toLocaleTimeString()}
                </span>
                <button
                  onClick={() => deleteFeed(feed.id)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, getTrackingUserId } from '../lib/firebase';
import { Moon, Sun, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Sleep {
  id: string;
  startTime: any;
  endTime: any;
}

export function SleepTracker({ onSleepChange }: { onSleepChange?: () => void }) {
  const [sleeping, setSleeping] = useState(false);
  const [currentSleepId, setCurrentSleepId] = useState<string | null>(null);
  const [recentSleeps, setRecentSleeps] = useState<Sleep[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const checkCurrentSleep = async () => {
      const trackingUserId = await getTrackingUserId();
      if (!trackingUserId) return;

      const q = query(
        collection(db, 'sleep'),
        where('userId', '==', trackingUserId),
        where('endTime', '==', null),
        orderBy('startTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        setCurrentSleepId(doc.id);
        setSleeping(true);
      }
    };

    checkCurrentSleep();
    fetchSleeps();
  }, []);

  const fetchSleeps = async () => {
    if (!auth.currentUser) return;

    const trackingUserId = await getTrackingUserId();
    if (!trackingUserId) return;

    const q = query(
      collection(db, 'sleep'),
      where('userId', '==', trackingUserId),
      orderBy('startTime', 'desc'),
      limit(5)
    );

    const querySnapshot = await getDocs(q);
    const sleeps = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Sleep[];

    setRecentSleeps(sleeps);
  };

  const startSleep = async () => {
    if (!auth.currentUser) return;

    const trackingUserId = await getTrackingUserId();
    if (!trackingUserId) return;

    const docRef = await addDoc(collection(db, 'sleep'), {
      userId: trackingUserId,
      startTime: serverTimestamp(),
      endTime: null,
    });
    
    setCurrentSleepId(docRef.id);
    setSleeping(true);
    onSleepChange?.();
  };

  const endSleep = async () => {
    if (!currentSleepId || !auth.currentUser) return;

    await updateDoc(doc(db, 'sleep', currentSleepId), {
      endTime: serverTimestamp(),
    });

    setCurrentSleepId(null);
    setSleeping(false);
    onSleepChange?.();
  };

  const deleteSleep = async (sleepId: string) => {
    if (!confirm('Are you sure you want to delete this sleep record?')) return;
    
    try {
      await deleteDoc(doc(db, 'sleep', sleepId));
      if (sleepId === currentSleepId) {
        setCurrentSleepId(null);
        setSleeping(false);
      }
      await fetchSleeps();
      onSleepChange?.();
    } catch (error) {
      console.error('Error deleting sleep:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Sleep Tracker</h2>
      <button
        onClick={sleeping ? endSleep : startSleep}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white transition-colors ${
          sleeping
            ? 'bg-yellow-500 hover:bg-yellow-600'
            : 'bg-purple-500 hover:bg-purple-600'
        }`}
      >
        {sleeping ? <Sun size={20} /> : <Moon size={20} />}
        {sleeping ? 'Wake Up' : 'Go to Sleep'}
      </button>

      <div className="mt-6">
        <h3 className="font-medium mb-2">Recent Sleep Records</h3>
        {recentSleeps.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No sleep records yet</p>
        ) : (
          <div className="space-y-2">
            {recentSleeps.map((sleep) => (
              <div
                key={sleep.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded group"
              >
                <div>
                  <div className="font-medium text-purple-600">
                    {formatDistanceToNow(sleep.startTime?.toDate(), { addSuffix: true })}
                  </div>
                  {sleep.endTime && (
                    <div className="text-sm text-gray-500">
                      to {formatDistanceToNow(sleep.endTime?.toDate(), { addSuffix: true })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteSleep(sleep.id)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
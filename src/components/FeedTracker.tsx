import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth, getTrackingUserId } from '../lib/firebase';
import { Baby, Plus, Minus } from 'lucide-react';

export function FeedTracker({ onFeedAdded }: { onFeedAdded?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [maternalAmount, setMaternalAmount] = useState(10);
  const [artificialAmount, setArtificialAmount] = useState(10);

  const addFeed = async (type: 'maternal' | 'artificial') => {
    if (!auth.currentUser) return;
    
    const trackingUserId = await getTrackingUserId();
    if (!trackingUserId) return;

    const amount = type === 'maternal' ? maternalAmount : artificialAmount;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'feeds'), {
        userId: trackingUserId,
        type,
        amount,
        timestamp: serverTimestamp(),
      });
      
      // Reset amount after successful add
      if (type === 'maternal') {
        setMaternalAmount(10);
      } else {
        setArtificialAmount(10);
      }
      
      onFeedAdded?.();
    } catch (error) {
      console.error('Error adding feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const AmountControl = ({ 
    amount, 
    setAmount, 
    type 
  }: { 
    amount: number; 
    setAmount: (n: number) => void; 
    type: 'maternal' | 'artificial' 
  }) => (
    <div className="flex flex-col items-stretch">
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={() => setAmount(Math.max(10, amount - 10))}
          className="text-gray-600 hover:text-gray-900"
        >
          <Minus size={16} />
        </button>
        <span className="font-medium">{amount}ml</span>
        <button
          onClick={() => setAmount(Math.min(200, amount + 10))}
          className="text-gray-600 hover:text-gray-900"
        >
          <Plus size={16} />
        </button>
      </div>
      <button
        onClick={() => addFeed(type)}
        disabled={loading}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white transition-colors disabled:opacity-50 ${
          type === 'maternal' 
            ? 'bg-blue-500 hover:bg-blue-600' 
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {type === 'maternal' ? <Plus size={20} /> : <Baby size={20} />}
        Add {amount}ml {type === 'maternal' ? 'Maternal' : 'Artificial'}
      </button>
    </div>
  );

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Milk Tracker</h2>
      <div className="grid grid-cols-2 gap-4">
        <AmountControl
          amount={maternalAmount}
          setAmount={setMaternalAmount}
          type="maternal"
        />
        <AmountControl
          amount={artificialAmount}
          setAmount={setArtificialAmount}
          type="artificial"
        />
      </div>
    </div>
  );
}
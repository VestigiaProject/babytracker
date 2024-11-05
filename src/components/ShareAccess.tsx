import { useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Users, Copy, X } from 'lucide-react';

export function ShareAccess() {
  const [isOpen, setIsOpen] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'share' | 'join'>('share');

  const generateShareCode = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Store the code with the user's ID
      await setDoc(doc(db, 'shares', code), {
        ownerId: auth.currentUser.uid,
        createdAt: new Date()
      });
      
      setShareCode(code);
      setError('');
    } catch (error) {
      console.error('Error generating share code:', error);
      setError('Failed to generate share code. Please try again.');
    }
  };

  const joinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !inputCode) return;

    try {
      const shareDoc = await getDoc(doc(db, 'shares', inputCode.toUpperCase()));
      
      if (!shareDoc.exists()) {
        setError('Invalid share code. Please check and try again.');
        return;
      }

      const { ownerId } = shareDoc.data();
      
      // Store the connection
      await setDoc(doc(db, 'connections', auth.currentUser.uid), {
        connectedTo: ownerId,
        connectedAt: new Date()
      });

      setError('');
      setIsOpen(false);
      window.location.reload(); // Refresh to load new data
    } catch (error) {
      console.error('Error joining with code:', error);
      setError('Failed to join. Please try again.');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <Users size={18} />
        Connect Parents
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Connect with Other Parent</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('share')}
                className={`flex-1 py-2 px-4 rounded-lg ${
                  mode === 'share'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Share
              </button>
              <button
                onClick={() => setMode('join')}
                className={`flex-1 py-2 px-4 rounded-lg ${
                  mode === 'join'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Join
              </button>
            </div>

            {mode === 'share' ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a code to share with the other parent so they can see and track your baby's data.
                </p>
                {shareCode ? (
                  <div className="text-center">
                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                      <span className="text-2xl font-mono font-bold tracking-wider">{shareCode}</span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(shareCode)}
                      className="flex items-center gap-2 mx-auto text-blue-500 hover:text-blue-600"
                    >
                      <Copy size={16} />
                      Copy Code
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generateShareCode}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Generate Share Code
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={joinWithCode}>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the share code you received to connect to your baby's tracker.
                </p>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter share code"
                  className="w-full px-3 py-2 border rounded-lg mb-4 font-mono uppercase"
                  maxLength={6}
                />
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Join
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
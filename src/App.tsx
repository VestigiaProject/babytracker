import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { Auth } from './components/Auth';
import { Status } from './components/Status';
import { Summary } from './components/Summary';
import { FeedTracker } from './components/FeedTracker';
import { SleepTracker } from './components/SleepTracker';
import { TimelineView } from './components/TimelineView';
import { ShareAccess } from './components/ShareAccess';
import { Baby } from 'lucide-react';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Baby className="text-blue-500" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">Milk Road</h1>
            </div>
            <div className="flex items-center gap-4">
              {user && <ShareAccess />}
              <Auth user={user} email={user?.email} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <>
            <Status refreshTrigger={refreshTrigger} />
            <TimelineView />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Summary refreshTrigger={refreshTrigger} onFeedDeleted={handleDataUpdate} />
              <div className="space-y-6">
                <FeedTracker onFeedAdded={handleDataUpdate} />
                <SleepTracker onSleepChange={handleDataUpdate} />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Welcome to Milk Road
            </h2>
            <p className="text-gray-600 mb-8">
              Track your baby's feeding and sleep patterns with ease.
              Sign in to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
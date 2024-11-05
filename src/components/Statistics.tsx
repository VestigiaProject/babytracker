// Update the statistics calculation
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

        // Calculate feed statistics
        const feeds = feedsSnapshot.docs
          .map(doc => ({ timestamp: doc.data().timestamp } as Feed))
          .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()); // Sort in descending order

        setFeedCount(feeds.length);

        if (feeds.length >= 2) {
          let totalInterval = 0;
          let intervalCount = 0;
          
          for (let i = 0; i < feeds.length - 1; i++) {
            const interval = differenceInMinutes(
              feeds[i].timestamp.toDate(),
              feeds[i + 1].timestamp.toDate()
            );
            if (interval > 0) {
              totalInterval += interval;
              intervalCount++;
            }
          }
          
          if (intervalCount > 0) {
            const avgInterval = totalInterval / intervalCount;
            setAverageFeedInterval(formatDuration({ minutes: Math.round(avgInterval) }));
          }
        }

        // Calculate sleep statistics
        const sleeps = sleepsSnapshot.docs
          .map(doc => ({
            startTime: doc.data().startTime,
            endTime: doc.data().endTime
          } as Sleep))
          .filter(sleep => sleep.endTime) // Only consider completed sleep periods
          .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());

        setSleepCount(sleeps.length);

        if (sleeps.length > 0) {
          let totalSleep = 0;
          let totalWake = 0;
          let sleepCount = 0;
          let wakeCount = 0;

          // Calculate sleep durations
          sleeps.forEach(sleep => {
            if (sleep.endTime) {
              const duration = differenceInMinutes(
                sleep.endTime.toDate(),
                sleep.startTime.toDate()
              );
              if (duration > 0) {
                totalSleep += duration;
                sleepCount++;
              }
            }
          });

          // Calculate wake durations
          for (let i = 0; i < sleeps.length - 1; i++) {
            if (sleeps[i].endTime && sleeps[i + 1].endTime) {
              const wakeDuration = differenceInMinutes(
                sleeps[i].startTime.toDate(),
                sleeps[i + 1].endTime.toDate()
              );
              if (wakeDuration > 0) {
                totalWake += wakeDuration;
                wakeCount++;
              }
            }
          }

          if (sleepCount > 0) {
            const avgSleep = totalSleep / sleepCount;
            setAverageSleepDuration(formatDuration({ minutes: Math.round(avgSleep) }));
          }

          if (wakeCount > 0) {
            const avgWake = totalWake / wakeCount;
            setAverageWakeDuration(formatDuration({ minutes: Math.round(avgWake) }));
          }
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();
  }, []);
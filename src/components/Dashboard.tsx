// src/components/Dashboard.tsx 내의 useEffect 부분
    fetchLiveData();
    const intervalId = setInterval(fetchLiveData, 60000); // 1분마다 갱신
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };

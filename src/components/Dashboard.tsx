import React, { useEffect, useState, useCallback } from 'react';
import { FinancialTicker } from './FinancialTicker'; // 가정된 경로

// 기존 코드의 구조를 유지하면서 fetch 로직을 개선합니다.
export const Dashboard = () => {
  const [tickerData, setTickerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      // cache: 'no-store'를 추가하여 클라우드플레어 및 브라우저 캐시를 우회합니다.
      const response = await fetch('/api/stocks', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      setTickerData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("데이터 가져오기 실패:", err);
      setError("데이터를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (isMounted) {
        await fetchLiveData();
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000); // 1분마다 갱신

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [fetchLiveData]);

  return (
    <div className="dashboard-container">
      {/* 에러 발생 시 사용자에게 알림 */}
      {error && (
        <div className="error-banner" style={{ color: 'red', padding: '10px' }}>
          {error}
        </div>
      )}
      
      <FinancialTicker 
        tickerData={tickerData} 
        loading={loading} 
        error={error} 
      />
      
      {lastUpdated && (
        <div className="text-xs text-gray-400 mt-2">
          마지막 업데이트: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
      
      {/* 나머지 대시보드 컴포넌트 내용 */}
    </div>
  );
};

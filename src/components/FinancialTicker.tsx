import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Loader } from 'lucide-react';

interface FinancialData {
  symbol: string;
  current?: number;
  value?: number;
  change: string | number;
  changePercent: number;
}

interface ApiResponse {
  success: boolean;
  data?: {
    usdkrw: FinancialData;
    kospi: FinancialData;
    nasdaq: FinancialData;
  };
}

const FinancialTicker = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 클라이언트 사이드에서 /api/stocks 엔드포인트 호출
        // 이 엔드포인트는 서버 측에서 무료 공개 API(open.er-api.com)를 호출함
        const response = await fetch('/api/stocks');
        
        if (!response.ok) {
          throw new Error('Failed to fetch financial data');
        }
        
        const apiData: ApiResponse = await response.json();
        
        if (apiData.success && apiData.data) {
          setData(apiData);
        } else {
          setError('데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('Error fetching financial data:', err);
        setError('데이터 불러오기 실패');
      } finally {
        setLoading(false);
      }
    };

    // 초기 로드
    fetchData();

    // 30초마다 새로고침 (시장 시간 중에는 더 자주)
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300">
        <Loader size={16} className="animate-spin" />
        <span>금융 데이터 불러오는 중...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-xs text-slate-400 px-4 py-2">
        데이터 로드 실패
      </div>
    );
  }

  if (!data?.data) {
    return null;
  }

  const { usdkrw, kospi, nasdaq } = data.data;

  const renderTickerItem = (item: FinancialData) => {
    const isPositive = item.changePercent >= 0;
    const value = item.current || item.value;
    const changeStr = typeof item.change === 'number' ? item.change.toFixed(2) : item.change;
    
    return (
      <div
        key={item.symbol}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
      >
        <span className="font-semibold text-xs text-slate-100 whitespace-nowrap">
          {item.symbol}
        </span>
        <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
          {value?.toLocaleString('ko-KR', {
            minimumFractionDigits: value > 100 ? 0 : 2,
            maximumFractionDigits: value > 100 ? 0 : 2,
          })}
        </span>
        <div
          className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${
            isPositive ? 'text-red-400' : 'text-blue-400'
          }`}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-2 px-4 py-2 min-w-min">
        {/* 제목 */}
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap pr-3 border-r border-slate-600">
          📊 실시간
        </span>

        {/* 데이터 아이템들 */}
        {renderTickerItem(usdkrw)}
        {renderTickerItem(kospi)}
        {renderTickerItem(nasdaq)}

        {/* 로딩 인디케이터 (갱신 중) */}
        {loading && data && (
          <div className="ml-3 pl-3 border-l border-slate-600">
            <Loader size={14} className="animate-spin text-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialTicker;


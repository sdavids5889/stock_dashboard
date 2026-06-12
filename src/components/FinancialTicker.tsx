import { TrendingUp, TrendingDown, Loader } from 'lucide-react';

export interface FinancialData {
  symbol: string;
  current?: number;
  value?: number;
  change: string | number;
  changePercent: number;
}

export interface ApiResponse {
  success: boolean;
  data?: {
    usdkrw: FinancialData;
    kospi: FinancialData;
    nasdaq: FinancialData;
    [key: string]: any; // 다른 주식 데이터도 포함될 수 있으므로 확장
  };
}

// 💡 부모(Dashboard)로부터 받을 Props 정의
interface FinancialTickerProps {
  tickerData: ApiResponse | null;
  loading: boolean;
  error: string | null;
}

const FinancialTicker = ({ tickerData, loading, error }: FinancialTickerProps) => {
  // 💡 기존에 있던 useState와 useEffect(fetch 로직)를 모두 제거했습니다!

  if (loading && !tickerData) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300">
        <Loader size={16} className="animate-spin" />
        <span>금융 데이터 불러오는 중...</span>
      </div>
    );
  }

  if (error && !tickerData) {
    return (
      <div className="text-xs text-slate-400 px-4 py-2">
        {error}
      </div>
    );
  }

  if (!tickerData?.data) {
    return null;
  }

  const { usdkrw, kospi, nasdaq } = tickerData.data;

  const renderTickerItem = (item: FinancialData) => {
    if (!item) return null;
    const isPositive = item.changePercent >= 0;
    const value = item.current || 0;
    
    return (
      <div
        key={item.symbol}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
      >
        <span className="font-semibold text-xs text-slate-100 whitespace-nowrap">
          {item.symbol === 'KRW=X' ? 'USD/KRW' : item.symbol === '^KS11' ? 'KOSPI' : 'NASDAQ'}
        </span>
        <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
          {value.toLocaleString('ko-KR', {
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
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap pr-3 border-r border-slate-600">
          📊 실시간
        </span>

        {renderTickerItem(usdkrw)}
        {renderTickerItem(kospi)}
        {renderTickerItem(nasdaq)}

        {loading && tickerData && (
          <div className="ml-3 pl-3 border-l border-slate-600">
            <Loader size={14} className="animate-spin text-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialTicker;
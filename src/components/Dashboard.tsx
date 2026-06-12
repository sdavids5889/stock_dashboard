import { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronRight,
  ArrowLeft,
  Activity,
  TrendingUp,
  TrendingDown,
  Tag,
  LayoutGrid,
} from 'lucide-react';
import FinancialTicker from './FinancialTicker';
import type { ApiResponse } from './FinancialTicker';
import type {
  Article,
  DailyMarketData,
  HeatmapStock,
} from '../lib/dashboardData';

interface LiveHeatmapStock extends HeatmapStock {
  price?: string;
}

interface DashboardProps {
  todayTags: string[];
  todayArticles: Article[];
  dailySummaries: DailyMarketData[];
  heatmapData: HeatmapStock[];
}

const isPositive = (changeStr: string) => changeStr.startsWith('+');

function ChangeText({ change }: { change: string }) {
  const positive = isPositive(change);
  return (
    <span
      className={`font-semibold ${positive ? 'text-red-500' : change === '—' ? 'text-slate-500' : 'text-blue-500'} flex items-center`}
    >
      {change !== '—' &&
        (positive ? (
          <TrendingUp size={16} className="mr-1" />
        ) : (
          <TrendingDown size={16} className="mr-1" />
        ))}
      {change}
    </span>
  );
}

function HeatmapBlock({ data }: { data: LiveHeatmapStock }) {
  const { name, change, weight, country, price } = data;
  const value = parseFloat(change.replace(/[^0-9.-]/g, ''));

  let bgClass = 'bg-slate-200 text-slate-800';
  let textClass = 'text-slate-800';

  if (value >= 5) { bgClass = 'bg-red-700'; textClass = 'text-white'; }
  else if (value >= 2) { bgClass = 'bg-red-500'; textClass = 'text-white'; }
  else if (value > 0) { bgClass = 'bg-red-300'; textClass = 'text-slate-800'; }
  else if (value <= -5) { bgClass = 'bg-blue-700'; textClass = 'text-white'; }
  else if (value <= -2) { bgClass = 'bg-blue-500'; textClass = 'text-white'; }
  else if (value < 0) { bgClass = 'bg-blue-300'; textClass = 'text-slate-800'; }

  const spanClass =
       weight === 'large' || weight === 'xlarge'
        ? 'col-span-2 row-span-2 min-h-[110px]'
        : weight === 'medium'
          ? 'col-span-2 row-span-1 min-h-[60px]'
          : 'col-span-1 row-span-1 min-h-[60px]';

  return (
    <div
      className={`relative ${bgClass} ${spanClass} ${textClass} p-2 rounded-xl flex flex-col justify-center items-center shadow-sm hover:brightness-110 hover:scale-[1.01] transition-all cursor-default border border-black/5`}
    >
      <div className="absolute top-1 left-2 text-[9px] opacity-60 font-bold tracking-tighter uppercase">
        {country}
      </div>
      <span className="font-bold text-xs sm:text-sm lg:text-base truncate w-full text-center tracking-tight px-1">
        {name}
      </span>
      {price && (
        <span className={`text-[10px] sm:text-xs opacity-80 font-mono mt-0.5 ${value !== 0 ? '' : 'opacity-60'}`}>
          {parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          <span className="text-[9px] ml-0.5">{country === 'KR' ? '원' : '$'}</span>
        </span>
      )}
      <span className="text-[11px] sm:text-xs font-bold mt-0.5 opacity-90">{change}</span>
    </div>
  );
}

function MarketSection({
  flag,
  flagBg,
  flagColor,
  title,
  region,
}: {
  flag: string;
  flagBg: string;
  flagColor: string;
  title: string;
  region: DailyMarketData['korea'];
}) {
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
      <div className="flex items-center mb-6">
        <div
          className={`w-10 h-10 rounded-full ${flagBg} flex items-center justify-center mr-4 ${flagColor}`}
        >
          <span className="font-bold text-lg">{flag}</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      </div>

      <p className="text-slate-600 text-sm mb-6 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
        {region.summary}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[region.indices.primary, region.indices.secondary].map(idx => (
          <div
            key={idx.label}
            className="bg-slate-50 rounded-xl p-4 border border-slate-100"
          >
            <div className="text-xs text-slate-500 mb-1">{idx.label}</div>
            <div className="text-lg font-bold text-slate-900">{idx.value}</div>
            <div className="text-sm mt-1">
              <ChangeText change={idx.change} />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center border-b border-slate-100 pb-2">
          <Activity size={16} className="mr-2 text-slate-400" />
          주목할 종목
        </h4>
        <ul className="space-y-4">
          {region.topStocks.map((stock, idx) => (
            <li
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between group"
            >
              <div className="flex items-center mb-1 sm:mb-0">
                <span className="font-semibold text-slate-800 w-24">{stock.name}</span>
                <span className="text-sm bg-slate-100 px-2 py-0.5 rounded ml-2 sm:ml-0 font-medium">
                  <ChangeText change={stock.change} />
                </span>
              </div>
              <span className="text-sm text-slate-500 sm:text-right flex-1 sm:ml-4 text-left">
                {stock.reason}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center border-b border-slate-100 pb-2">
          <Tag size={16} className="mr-2 text-slate-400" />
          주도 테마
        </h4>
        <div className="flex flex-wrap gap-2">
          {region.themes.length > 0 ? (
            region.themes.map((theme, idx) => (
              <span
                key={idx}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-full shadow-sm"
              >
                {theme}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">테마 정보 없음</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  todayTags,
  todayArticles,
  dailySummaries,
  heatmapData,
}: DashboardProps) {
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);
  const [heatmapCountry, setHeatmapCountry] = useState('ALL');
  const [heatmapSector, setHeatmapSector] = useState('ALL');
  
  const [liveHeatmapData, setLiveHeatmapData] = useState<LiveHeatmapStock[]>(heatmapData);
  const [tickerData, setTickerData] = useState<ApiResponse | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLiveData = async () => {
      try {
        setIsLiveLoading(true);
        const res = await fetch('/api/stocks');
        const json = await res.json();

        if (json.success && json.data && isMounted) {
          setLiveHeatmapData(prevHeatmapData =>
            prevHeatmapData.map(stock => {
              const targetSymbol = (stock.symbol || stock.name || '').trim();
              const liveStock = json.data[targetSymbol];

              if (liveStock && liveStock.current !== undefined) {
                const percent = liveStock.changePercent ?? 0;
                return {
                  ...stock,
                  price: liveStock.current.toString(),
                  change: `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`,
                };
              }
              return stock;
            })
          );
          
          setTickerData(json);
          setLiveError(null);
        } else if (isMounted) {
          setLiveError('데이터 형식 오류');
        }
      } catch (error) {
        console.error('실시간 연동 실패:', error);
        if (isMounted) setLiveError('통신 실패');
      } finally {
        if (isMounted) setIsLiveLoading(false);
      }
    };

    fetchLiveData();
    const intervalId = setInterval(fetchLiveData, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleCardClick = (id: string) => {
    setSelectedDateId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedData = dailySummaries.find(d => d.id === selectedDateId);

  const filteredHeatmap = liveHeatmapData.filter(
    stock =>
      (heatmapCountry === 'ALL' || stock.country === heatmapCountry) &&
      (heatmapSector === 'ALL' || stock.sector === heatmapSector),
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-100">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-lg">
        <FinancialTicker 
          tickerData={tickerData} 
          loading={isLiveLoading} 
          error={liveError} 
        />
      </div>

      <header className="sticky top-[52px] z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <Activity size={24} strokeWidth={2.5} />
            <h1 className="text-xl font-bold tracking-tight">글로벌 마켓 요약</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium hidden sm:block">
            매일 업데이트되는 핵심 시장 정보
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {!selectedData ? (
          <div className="space-y-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">시장 요약 대시보드</h2>
              <p className="text-slate-600">
                날짜를 선택하여 한국과 미국 주식 시장의 세부 동향을 확인하세요.
              </p>
            </div>

            {(todayArticles.length > 0 || todayTags.length > 0) && (
              <section className="mb-10">
                <h3 className="text-lg font-bold text-slate-900 mb-3">📌 오늘의 실시간 정보</h3>

                {todayTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <span className="w-full text-xs font-semibold text-slate-500 mb-1">
                      🔥 오늘의 핵심 키워드
                    </span>
                    {todayTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {todayArticles.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {todayArticles.map(article => (
                      <a
                        key={article.slug}
                        href={`/blog/${article.slug}`}
                        className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
                      >
                        <h4 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {article.title}
                        </h4>
                        <p className="text-sm text-slate-600 line-clamp-2">{article.description}</p>
                        <span className="inline-block mt-3 text-xs text-indigo-500 font-medium">
                          상세 요약 보기 →
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6 bg-white rounded-2xl border border-slate-100">
                    아직 오늘 수집된 실시간 뉴스가 없습니다.
                  </p>
                )}
              </section>
            )}

            {dailySummaries.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-1">📅 지난 시장 요약</h3>
                <p className="text-sm text-slate-500 mb-4">카드를 클릭하면 상세 내용을 볼 수 있습니다.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {dailySummaries.map(data => (
                    <div
                      key={data.id}
                      onClick={() => handleCardClick(data.id)}
                      className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            <Calendar size={14} className="mr-2" />
                            {data.date}
                          </div>
                          <ChevronRight
                            size={20}
                            className="text-slate-300 group-hover:text-indigo-500 transition-colors"
                          />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {data.headline}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{data.summary}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {data.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {dailySummaries.length === 0 && todayArticles.length === 0 && (
              <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
                <Activity size={48} className="mx-auto mb-4 opacity-20" />
                <p>수집된 시장 정보가 없습니다.</p>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">오늘의 시장 히트맵</h2>
                <p className="text-slate-600">
                  국가 및 섹터별로 시가총액 상위 종목 현황을 필터링하여 확인하세요.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="flex bg-slate-100 p-1 rounded-lg w-full lg:w-auto">
                    {(['ALL', 'KR', 'US'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHeatmapCountry(c)}
                        className={`flex-1 lg:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                          heatmapCountry === c
                            ? 'bg-white shadow text-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {c === 'ALL' ? '글로벌 전체' : c === 'KR' ? '한국 (KR)' : '미국 (US)'}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['ALL', '기술', '자동차', '바이오', '금융', '제조/기타'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setHeatmapSector(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                          heatmapSector === s
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        {s === 'ALL' ? '전체 섹터' : s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 grid-flow-dense gap-2 min-h-[240px]">
                  {filteredHeatmap.length > 0 ? (
                    filteredHeatmap.map((stock, idx) => (
                      <HeatmapBlock key={`${stock.name}-${idx}`} data={stock} />
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                      <LayoutGrid size={48} className="mb-4 opacity-20" />
                      <p>해당 조건에 맞는 종목이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setSelectedDateId(null)}
              className="group flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
            >
              <div className="bg-white p-2 rounded-full shadow-sm border border-slate-200 group-hover:border-indigo-200 mr-3">
                <ArrowLeft size={16} />
              </div>
              대시보드로 돌아가기
            </button>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
              <div className="flex items-center text-sm font-medium text-indigo-600 mb-3">
                <Calendar size={16} className="mr-2" />
                {selectedData.date}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                {selectedData.headline}
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">{selectedData.summary}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <MarketSection
                flag="KR"
                flagBg="bg-blue-50"
                flagColor="text-blue-600"
                title="한국 증시 요약"
                region={selectedData.korea}
              />
              <MarketSection
                flag="US"
                flagBg="bg-emerald-50"
                flagColor="text-emerald-600"
                title="미국 증시 요약"
                region={selectedData.us}
              />
            </div>

            {selectedData.articles.length > 0 && (
              <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">📰 해당 일자 수집 기사</h3>
                <ul className="space-y-3">
                  {selectedData.articles.map(article => (
                    <li key={article.slug}>
                      <a
                        href={`/blog/${article.slug}`}
                        className="text-sm text-slate-700 hover:text-indigo-600 font-medium block truncate"
                      >
                        {article.title}
                      </a>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{article.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
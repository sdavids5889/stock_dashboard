export interface Article {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

export interface TopStock {
  name: string;
  change: string;
  reason: string;
}

export interface IndexData {
  label: string;
  value: string;
  change: string;
}

export interface MarketRegion {
  summary: string;
  indices: {
    primary: IndexData;
    secondary: IndexData;
  };
  topStocks: TopStock[];
  themes: string[];
}

export interface DailyMarketData {
  id: string;
  date: string;
  headline: string;
  tags: string[];
  summary: string;
  articles: Article[];
  korea: MarketRegion;
  us: MarketRegion;
}

export interface HeatmapStock {
  symbol: string; 
  name: string;
  change: string;
  weight: 'xlarge' | 'large' | 'medium' | 'small';
  country: 'KR' | 'US';
  sector: string;
}

export interface MarketStock {
  symbol: string;
  name: string;
  country: string;
  sector: string;
  sectorLabel: string;
  marketCap: number;
  changePercent: number;
}

interface BlogPost {
  slug: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    tags: string[];
  };
}

const US_PATTERN = /미국|美|나스닥|nasdaq|s&p|엔비디아|nvidia|fed|연준|서학|애플|apple|tesla|microsoft|google|alphabet|amazon|meta|빅테크|나스닥|snp|실리콘/i;
const KR_PATTERN = /국내|한국|코스피|코스닥|삼성|하이닉스|국내증시|kb금융|현대차|기아|카카오|naver|네이버|두산|lg|에코프로|셀트리온|posco|국장|한국증시/i;

const AUTO_NAMES = new Set(['Tesla', 'Toyota', '현대차', '기아']);

function toKSTDateStr(date: Date): string {
  return new Date(date).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function toDateId(date: Date): string {
  const kst = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function postText(post: BlogPost): string {
  return `${post.data.title} ${post.data.description} ${(post.data.tags || []).join(' ')}`;
}

function isUSPost(post: BlogPost): boolean {
  return US_PATTERN.test(postText(post));
}

function isKRPost(post: BlogPost): boolean {
  return KR_PATTERN.test(postText(post));
}

function classifyPosts(posts: BlogPost[]) {
  const us = posts.filter(isUSPost);
  const kr = posts.filter(isKRPost);
  const neutral = posts.filter(p => !isUSPost(p) && !isKRPost(p));
  return {
    us: [...us, ...neutral.filter((_, i) => i % 2 === 1)],
    kr: [...kr, ...neutral.filter((_, i) => i % 2 === 0)],
  };
}

function avgChange(stocks: MarketStock[]): number {
  if (stocks.length === 0) return 0;
  return stocks.reduce((s, x) => s + x.changePercent, 0) / stocks.length;
}

function buildTopStocks(
  stocks: MarketStock[],
  posts: BlogPost[],
  limit = 3,
): TopStock[] {
  const country = stocks[0]?.country;
  const sorted = [...stocks]
    .filter(s => s.country === country)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, limit);

  return sorted.map(stock => {
    const related = posts.find(
      p =>
        postText(p).includes(stock.name) ||
        postText(p).toLowerCase().includes(stock.symbol.toLowerCase()),
    );
    return {
      name: stock.name,
      change: formatChange(stock.changePercent),
      reason: related?.data.description || `${stock.name} 등락률 ${formatChange(stock.changePercent)}`,
    };
  });
}

function buildThemes(posts: BlogPost[], limit = 3): string[] {
  const tags = posts.flatMap(p => p.data.tags || []);
  const freq = new Map<string, number>();
  tags.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

function buildRegion(
  posts: BlogPost[],
  stocks: MarketStock[],
  country: 'KR' | 'US',
  indexLabels: [string, string],
  fallback: string,
): MarketRegion {
  const countryStocks = stocks.filter(s => s.country === country);
  const avg = avgChange(countryStocks);
  const descriptions = posts.map(p => p.data.description).filter(Boolean);

  return {
    summary:
      descriptions.slice(0, 2).join(' ') ||
      (posts.length > 0 ? posts[0].data.title : fallback),
    indices: {
      primary: { label: indexLabels[0], value: '—', change: formatChange(avg) },
      secondary: {
        label: indexLabels[1],
        value: '—',
        change: formatChange(avg * 1.1),
      },
    },
    topStocks:
      buildTopStocks(countryStocks, posts).length > 0
        ? buildTopStocks(countryStocks, posts)
        : posts.slice(0, 3).map(p => ({
            name: p.data.title.slice(0, 20) + (p.data.title.length > 20 ? '…' : ''),
            change: '—',
            reason: p.data.description,
          })),
    themes: buildThemes(posts),
  };
}

// 💡 누락되었던 buildDailyEntry 함수가 정상적으로 포함되어 있습니다.
function buildDailyEntry(
  dateKey: string,
  posts: BlogPost[],
  marketStocks: MarketStock[],
): DailyMarketData {
  const sorted = [...posts].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  const { kr, us } = classifyPosts(sorted);
  const tags = [...new Set(sorted.flatMap(p => p.data.tags || []))].slice(0, 3);
  const descriptions = sorted.map(p => p.data.description).filter(Boolean);

  return {
    id: dateKey,
    date: formatDisplayDate(sorted[0].data.pubDate),
    headline: sorted[0].data.title,
    tags: tags.map(t => (t.startsWith('#') ? t : `#${t}`)),
    summary:
      descriptions.slice(0, 2).join(' ') ||
      sorted.map(p => p.data.title).slice(0, 2).join(' · '),
    articles: sorted.map(p => ({
      slug: p.slug,
      title: p.data.title,
      description: p.data.description,
      tags: p.data.tags || [],
    })),
    korea: buildRegion(
      kr,
      marketStocks,
      'KR',
      ['KOSPI', 'KOSDAQ'],
      '해당 일자 국내 증시 관련 뉴스가 수집되지 않았습니다.',
    ),
    us: buildRegion(
      us,
      marketStocks,
      'US',
      ['S&P 500', 'NASDAQ'],
      '해당 일자 미국 증시 관련 뉴스가 수집되지 않았습니다.',
    ),
  };
}

function toHeatmapSector(stock: MarketStock): string {
  if (AUTO_NAMES.has(stock.name)) return '자동차';
  const map: Record<string, string> = {
    Technology: '기술',
    Healthcare: '바이오',
    Finance: '금융',
    Consumer: '자동차',
    Industrial: '제조/기타',
    Energy: '제조/기타',
  };
  return map[stock.sector] || '제조/기타';
}

function buildHeatmapData(stocks: MarketStock[]): HeatmapStock[] {
  const filtered = stocks.filter(s => s.country === 'KR' || s.country === 'US');
  const sorted = [...filtered].sort((a, b) => b.marketCap - a.marketCap);

  return sorted.map((stock, i) => ({
    symbol: stock.symbol, 
    name: stock.name,
    change: formatChange(stock.changePercent),
    weight: i < 3 ? 'large' : i < 10 ? 'medium' : 'small',
    country: stock.country as 'KR' | 'US',
    sector: toHeatmapSector(stock),
  }));
}

export function buildDashboardData(
  posts: BlogPost[],
  marketStocks: MarketStock[],
  todayStr: string,
) {
  const sorted = [...posts].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const todayPosts = sorted.filter(p => toKSTDateStr(p.data.pubDate) === todayStr);
  const pastPosts = sorted.filter(p => toKSTDateStr(p.data.pubDate) !== todayStr);

  const todayTags = [...new Set(todayPosts.flatMap(p => p.data.tags || []))]
    .sort()
    .slice(0, 10)
    .map(t => (t.startsWith('#') ? t : `#${t}`));

  const todayArticles: Article[] = todayPosts.map(p => ({
    slug: p.slug,
    title: p.data.title,
    description: p.data.description,
    tags: p.data.tags || [],
  }));

  const pastByDate = new Map<string, BlogPost[]>();
  pastPosts.forEach(post => {
    const dateKey = toDateId(post.data.pubDate);
    if (!pastByDate.has(dateKey)) pastByDate.set(dateKey, []);
    pastByDate.get(dateKey)!.push(post);
  });

  const dailySummaries = Array.from(pastByDate.entries())
    .map(([dateKey, dayPosts]) => buildDailyEntry(dateKey, dayPosts, marketStocks))
    .sort((a, b) => b.id.localeCompare(a.id));

  const heatmapData = buildHeatmapData(marketStocks);

  return { todayTags, todayArticles, dailySummaries, heatmapData };
}
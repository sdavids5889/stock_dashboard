import type { APIRoute } from 'astro';
import YahooFinance from 'yahoo-finance2';

// v3 API: YahooFinance 인스턴스를 먼저 생성해야 함
const yahooFinance = new YahooFinance();

export const GET: APIRoute = async () => {
  try {
    const symbols = [
      'KRW=X', '^KS11', '^IXIC', 
      'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 
      '005930.KS', '000660.KS', '373220.KS', '207940.KS', '005380.KS'
    ];

    // 이제 가짜 껍데기가 아니므로 에러 없이 인증 토큰을 생성하고 데이터를 가져옵니다.
    const results = await yahooFinance.quote(symbols);

    const marketData: Record<string, any> = {};
    
    results.forEach((item: any) => {
      marketData[item.symbol] = {
        symbol: item.symbol,
        current: item.regularMarketPrice,
        change: item.regularMarketChange,
        changePercent: item.regularMarketChangePercent,
        previous: item.regularMarketPreviousClose
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: marketData,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('실시간 금융 데이터 조회 중 오류:', error);
    return new Response(
      JSON.stringify({ success: false, error: '데이터를 불러올 수 없습니다' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
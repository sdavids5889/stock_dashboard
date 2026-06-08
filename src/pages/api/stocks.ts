import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // 💡 [수정] 'as any'를 붙여서 에디터의 빨간 줄(타입스크립트 잔소리)을 강제로 없앱니다.
    const mod = (await import('yahoo-finance2')) as any;
    let yahooFinance;
    
    if (mod.YahooFinance) {
        yahooFinance = new mod.YahooFinance();
    } else if (mod.default && mod.default.YahooFinance) {
        yahooFinance = new mod.default.YahooFinance();
    } else if (typeof mod.default === 'function') {
        yahooFinance = new (mod.default)();
    } else {
        yahooFinance = mod.default || mod;
    }

    const symbols = [
      'KRW=X', '^KS11', '^IXIC', 
      'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 
      '005930.KS', '000660.KS', '373220.KS', '207940.KS', '005380.KS'
    ];

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

    // 💡 [핵심] 흰 화면(White Screen) 해결! 
    // 프론트엔드가 놀라지 않도록, 예전 이름표(usdkrw, kospi, nasdaq)를 추가로 달아줍니다.
    if (marketData['KRW=X']) marketData.usdkrw = marketData['KRW=X'];
    if (marketData['^KS11']) marketData.kospi = marketData['^KS11'];
    if (marketData['^IXIC']) marketData.nasdaq = marketData['^IXIC'];

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
import type { APIRoute } from 'astro';

// 환율 및 주식 지수 데이터를 반환하는 API 엔드포인트
// 클라이언트에서 이 엔드포인트를 호출하여 데이터를 받음
export const GET: APIRoute = async () => {
  try {
    // 1. USD/KRW 환율 데이터 (open.er-api.com 무료 API - CORS 지원)
    let krwRate = 1300; // 기본값
    let previousKrwRate = 1287; // 기본값
    
    try {
      const exchangeRateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const exchangeRateData = await exchangeRateRes.json();
      if (exchangeRateData?.rates?.KRW) {
        krwRate = exchangeRateData.rates.KRW;
        // 어제 환율을 시뮬레이션 (실제로는 DB에서 가져와야 함)
        previousKrwRate = krwRate * 0.995; // 가정: 어제는 0.5% 낮음
      }
    } catch (err) {
      console.warn('환율 API 호출 실패, 기본값 사용:', err);
    }

    // 2. KOSPI 데이터 (모의 데이터 - 실제 프로젝트에서는 Alpha Vantage, Finnhub 등 사용)
    const kospiData = {
      symbol: 'KOSPI',
      value: 2450.5,
      change: '+15.25',
      changePercent: 0.63,
      previousClose: 2435.25,
    };

    // 3. NASDAQ 데이터 (모의 데이터)
    const nasdaqData = {
      symbol: 'NASDAQ',
      value: 18456.78,
      change: '+125.50',
      changePercent: 0.69,
      previousClose: 18331.28,
    };

    // 환율 변화 계산
    const krwChange = krwRate - previousKrwRate;
    const krwChangePercent = (krwChange / previousKrwRate) * 100;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          usdkrw: {
            symbol: 'USD/KRW',
            current: Math.round(krwRate * 100) / 100,
            previous: Math.round(previousKrwRate * 100) / 100,
            change: Math.round(krwChange * 100) / 100,
            changePercent: parseFloat(krwChangePercent.toFixed(2)),
          },
          kospi: kospiData,
          nasdaq: nasdaqData,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('금융 데이터 조회 중 오류:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '금융 데이터를 불러올 수 없습니다',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};


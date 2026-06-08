import json
import os
import zoneinfo
from datetime import datetime
import yfinance as yf
import pandas as pd

KST = zoneinfo.ZoneInfo("Asia/Seoul")
OUTPUT_PATH = "public/data/market.json"

def get_top_tickers():
    # 미국 상위 10개 (yfinance 스크리너 활용)
    us_data = yf.Tickers("AAPL MSFT NVDA GOOGL AMZN META TSLA BRK-B JPM V") 
    # 한국은 별도 API가 제한적이므로 상징적인 대형주 10개 유지하되 필요시 URL 크롤링으로 확장 가능
    kr_tickers = [
        "005930.KS", "000660.KS", "373220.KS", "207940.KS", "005380.KS",
        "000270.KS", "068270.KS", "105560.KS", "035420.KS", "055550.KS"
    ]
    return list(us_data.tickers.keys()) + kr_tickers

def fetch_stock(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 이름과 섹터 매핑 (없는 경우 기본값)
        name = info.get("shortName") or info.get("longName") or symbol
        sector = info.get("sector") or "기타"
        country = "KR" if ".KS" in symbol else "US"
        
        hist = ticker.history(period="2d")
        if len(hist) < 2: return None
        
        prev_close = hist["Close"].iloc[-2]
        curr_close = hist["Close"].iloc[-1]
        change = ((curr_close - prev_close) / prev_close) * 100
        
        return {
            "symbol": symbol,
            "name": name,
            "country": country,
            "countryLabel": "한국" if country == "KR" else "미국",
            "sector": sector,
            "sectorLabel": sector,
            "marketCap": info.get("marketCap", 0),
            "changePercent": round(change, 2),
            "price": round(float(curr_close), 2),
            "weight": "medium" # 자동 필터링 시 가중치 기본값
        }
    except Exception as e:
        return None

def main():
    print("🚀 자동 종목 선정 및 데이터 수집 시작...")
    tickers = get_top_tickers()
    results = []
    
    for symbol in tickers:
        stock = fetch_stock(symbol)
        if stock and stock["marketCap"] > 0:
            results.append(stock)
            print(f"✅ {stock['name']} ({symbol}) 수집 완료")

    # 시총 순 정렬
    results.sort(key=lambda x: x["marketCap"], reverse=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"updatedAt": datetime.now(KST).isoformat(), "stocks": results}, f, ensure_ascii=False, indent=2)

    print(f"💾 총 {len(results)}개 종목 저장 완료")

if __name__ == "__main__":
    main()
import json
import os
import zoneinfo
from datetime import datetime
import yfinance as yf
import pandas as pd

KST = zoneinfo.ZoneInfo("Asia/Seoul")
OUTPUT_PATH = "public/data/market.json"

# 💡 대시보드 필터와 완벽하게 연동되는 섹터 한글화 맵핑
SECTOR_MAP = {
    "Technology": "기술", "Consumer Cyclical": "자동차", "Consumer Defensive": "자동차",
    "Healthcare": "바이오", "Financial Services": "금융", "Communication Services": "기술",
    "Industrials": "제조/기타"
}

def get_top_tickers():
    # 미국 상위 10개 및 한국 상위 10개 (프론트엔드 실시간 API와 동일한 구성)
    us_tickers = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "JPM", "V"]
    kr_tickers = ["005930.KS", "000660.KS", "373220.KS", "207940.KS", "005380.KS", 
                  "000270.KS", "068270.KS", "105560.KS", "035420.KS", "055550.KS"]
    return us_tickers + kr_tickers

def fetch_stock(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        name = info.get("shortName") or info.get("longName") or symbol
        raw_sector = info.get("sector") or "기타"
        
        hist = ticker.history(period="2d")
        if len(hist) < 2: return None
        
        change = ((hist["Close"].iloc[-1] - hist["Close"].iloc[-2]) / hist["Close"].iloc[-2]) * 100
        
        return {
            "symbol": symbol,
            "name": name,
            "country": "KR" if ".KS" in symbol else "US",
            "sector": raw_sector,
            "sectorLabel": SECTOR_MAP.get(raw_sector, "제조/기타"),
            "marketCap": info.get("marketCap", 0),
            "changePercent": round(change, 2),
            "price": round(float(hist["Close"].iloc[-1]), 2),
            "weight": "medium" # 초기 기본값
        }
    except Exception as e:
        print(f"⚠️ 데이터 수집 실패 ({symbol}): {e}")
        return None

def main():
    now_kst = datetime.now(KST)
    print(f"🚀 주식 시장 데이터 수집 및 가중치 계산 가동 (KST: {now_kst.strftime('%Y-%m-%d %H:%M:%S')})")
    
    results = [s for s in [fetch_stock(sym) for sym in get_top_tickers()] if s]
    
    # 1. 시총 기준 내림차순 정렬
    results.sort(key=lambda x: x["marketCap"], reverse=True)
    
    # 2. 체급(weight) 자동 할당 (대시보드 히트맵 크기 결정용)
    for i, stock in enumerate(results):
        if i < 2: stock["weight"] = "xlarge"     # 1~2위 초특대
        elif i < 6: stock["weight"] = "large"    # 3~6위 특대
        elif i < 12: stock["weight"] = "medium"  # 7~12위 중간
        else: stock["weight"] = "small"          # 나머지 소형

    # 3. JSON 파일로 정적 데이터 구워내기
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"updatedAt": now_kst.isoformat(), "stocks": results}, f, ensure_ascii=False, indent=2)

    print(f"💾 총 {len(results)}개 종목 저장 완료 (체급/섹터 매핑 완벽 적용)")

if __name__ == "__main__":
    main()
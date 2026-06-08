import json
import os
import zoneinfo
from datetime import datetime
import yfinance as yf

KST = zoneinfo.ZoneInfo("Asia/Seoul")
OUTPUT_PATH = "public/data/market.json"

# 한국 종목 한글 이름 매핑 (스크립트가 스스로 찾지 못할 때 대비)
KR_NAMES = {
    "005930.KS": "삼성전자", "000660.KS": "SK하이닉스", "373220.KS": "LG엔솔",
    "207940.KS": "삼성바이오", "005380.KS": "현대차", "000270.KS": "기아",
    "068270.KS": "셀트리온", "105560.KS": "KB금융", "035420.KS": "NAVER", "055550.KS": "신한지주"
}

# 대략적인 환율 (더 정확히 하려면 실시간 환율 호출이 가능하지만 일단 고정치 사용)
USD_KRW = 1350.0

def fetch_stock(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 이름 결정: 한글 매핑 우선 -> 없으면 영문명
        name = KR_NAMES.get(symbol) or info.get("shortName") or symbol
        
        # 달러 환산 시총 계산
        m_cap = info.get("marketCap") or 0
        currency = info.get("currency") or "USD"
        m_cap_usd = m_cap / USD_KRW if currency == "KRW" else m_cap
        
        hist = ticker.history(period="2d")
        if len(hist) < 2: return None
        
        change = ((hist["Close"].iloc[-1] - hist["Close"].iloc[-2]) / hist["Close"].iloc[-2]) * 100
        
        return {
            "symbol": symbol,
            "name": name,
            "country": "KR" if ".KS" in symbol else "US",
            "countryLabel": "한국" if ".KS" in symbol else "미국",
            "sector": info.get("sector") or "기타",
            "marketCap": m_cap_usd, # 환산 시총
            "changePercent": round(change, 2),
            "price": round(float(hist["Close"].iloc[-1]), 2),
            "weight": "medium"
        }
    except: return None

def main():
    symbols = [
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "JPM", "V",
        "005930.KS", "000660.KS", "373220.KS", "207940.KS", "005380.KS",
        "000270.KS", "068270.KS", "105560.KS", "035420.KS", "055550.KS"
    ]
    
    results = [s for s in [fetch_stock(sym) for sym in symbols] if s]
    
    # 환산된 시총 기준으로 내림차순 정렬 (이러면 글로벌 통합 순위가 됨)
    results.sort(key=lambda x: x["marketCap"], reverse=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"updatedAt": datetime.now(KST).isoformat(), "stocks": results}, f, ensure_ascii=False, indent=2)

    print(f"💾 {len(results)}개 종목 한글화 및 시총 정렬 완료")

if __name__ == "__main__":
    main()
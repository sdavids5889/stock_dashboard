import json
import os
import zoneinfo
from datetime import datetime

import yfinance as yf

KST = zoneinfo.ZoneInfo("Asia/Seoul")
OUTPUT_PATH = "public/data/market.json"

STOCKS = [
    # 미국(US) 시총 상위 5개
    ("AAPL", "Apple", "US", "Technology"),
    ("MSFT", "Microsoft", "US", "Technology"),
    ("NVDA", "NVIDIA", "US", "Technology"),
    ("GOOGL", "Alphabet", "US", "Technology"),
    ("AMZN", "Amazon", "US", "Consumer"),
    
    # 한국(KR) 시총 상위 5개
    ("005930.KS", "삼성전자", "KR", "Technology"),
    ("000660.KS", "SK하이닉스", "KR", "Technology"),
    ("373220.KS", "LG에너지솔루션", "KR", "Industrial"),
    ("207940.KS", "삼성바이오로직스", "KR", "Healthcare"),
    ("005380.KS", "현대차", "KR", "Consumer"),
]

COUNTRY_LABELS = {
    "US": "미국",
    "KR": "한국",
    "JP": "일본",
    "CN": "중국",
    "TW": "대만",
}

SECTOR_LABELS = {
    "Technology": "기술",
    "Healthcare": "헬스케어",
    "Finance": "금융",
    "Energy": "에너지",
    "Consumer": "소비재",
    "Industrial": "산업재",
}

# yfinance 시가총액은 거래소 통화 기준이므로 USD 환산용 고정 환율
FX_TO_USD = {
    "USD": 1.0,
    "KRW": 1 / 1350,
    "JPY": 1 / 150,
    "TWD": 1 / 32,
}


def to_usd_market_cap(market_cap: int, currency: str) -> int:
    rate = FX_TO_USD.get(currency, 1.0)
    return int(market_cap * rate)


def fetch_stock(symbol: str, name: str, country: str, sector: str) -> dict | None:
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="2d")

        change = 0.0
        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0

        if len(hist) >= 2:
            prev_close = hist["Close"].iloc[-2]
            curr_close = hist["Close"].iloc[-1]
            change = ((curr_close - prev_close) / prev_close) * 100
            price = float(curr_close)
        elif len(hist) == 1:
            price = float(hist["Close"].iloc[-1])

        market_cap = info.get("marketCap") or 0
        currency = info.get("currency") or "USD"
        market_cap_usd = to_usd_market_cap(int(market_cap), currency)

        return {
            "symbol": symbol,
            "name": name,
            "country": country,
            "countryLabel": COUNTRY_LABELS.get(country, country),
            "sector": sector,
            "sectorLabel": SECTOR_LABELS.get(sector, sector),
            "marketCap": market_cap_usd,
            "currency": currency,
            "changePercent": round(change, 2),
            "price": round(float(price), 2),
        }
    except Exception as e:
        print(f"⚠️ {symbol} 조회 실패: {e}")
        return None


def main():
    print(f"📈 시장 데이터 수집 시작 (KST: {datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')})")

    results = []
    for symbol, name, country, sector in STOCKS:
        stock = fetch_stock(symbol, name, country, sector)
        if stock and stock["marketCap"] > 0:
            results.append(stock)
            print(f"✅ {name} ({symbol}): 시총 {stock['marketCap']:,} / {stock['changePercent']:+.2f}%")

    results.sort(key=lambda x: x["marketCap"], reverse=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    data = {
        "updatedAt": datetime.now(KST).isoformat(),
        "stocks": results,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"💾 {len(results)}개 종목 저장 완료 → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

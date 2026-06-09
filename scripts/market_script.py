import os
import hashlib
import json
import re
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import zoneinfo
import feedparser
import google.generativeai as genai
from typing_extensions import TypedDict

# ==========================================
# 🛑 프로덕션 안전 제어 상수
# ==========================================
MAX_SUMMARIES_PER_RUN = 5  # 핵심 주식/경제 뉴스 딱 5개만 수집
MAX_INPUT_TEXT_CHAR = 2500  # 입력 토큰 최적화
# ==========================================

KST = zoneinfo.ZoneInfo("Asia/Seoul")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

class SummaryResponse(TypedDict):
    short_desc: str
    summary_1: str
    summary_2: str
    summary_3: str
    tags: list[str]

# 💡 경제/주식 타겟팅 RSS로 압축 (한국/미국 증시, 거시경제 중심)
RSS_FEEDS = [
    "https://news.google.com/rss/search?q=%EA%B2%BD%EC%A0%9C+%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko",
    "https://www.hankyung.com/feed/stock",
    "https://rss.etoday.co.kr/SectionCode/SectionID.php?secid=6000"
]

OUTPUT_DIR = "src/content/blog"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def clean_string_for_yaml(text):
    if not text: return ""
    return re.sub(r'\s+', ' ', text).strip().replace('"', '\\"')

def summarize_with_gemini(title, description):
    # 💡 AI에게 '무관한 기사'를 쳐내는 권한 부여
    prompt = f"""
    당신은 냉철한 금융 전문 애널리스트입니다. 아래 기사를 분석해주세요.
    [조건]
    1. 이 기사가 한국/미국 주식, ETF, 거시 경제 등 금융 시장과 완전히 무관한 기사(연예, 단순 사고, 정치 스캔들 등)라면, 'short_desc' 필드에 정확히 'IRRELEVANT'라고만 적어주세요.
    2. 관련 있는 경제 뉴스라면, 제목과 내용을 바탕으로 핵심을 파악해 한국어 요약본을 만들어주세요.

    제목: {title}
    내용: {description}
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=SummaryResponse,
                temperature=0.1 # 일관성을 위해 온도 낮춤
            )
        )
        return json.loads(response.text)
    except Exception as e:
        error_msg = str(e).lower()
        # 💡 API 토큰 고갈 또는 Rate Limit 감지 시 하드 스톱 신호 전송
        if "429" in error_msg or "quota" in error_msg or "exhausted" in error_msg:
            print("🚨 [위험] Gemini API 무료 제공량(Quota) 초과! 크롤링을 전면 중단합니다.")
            return "QUOTA_EXCEEDED"
        print(f"❌ API 호출 오류: {e}")
        return None

def fetch_full_article_content(url: str) -> str:
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in soup(["script", "style", "header", "footer", "nav"]): tag.decompose()
        article = soup.find('article') or soup.find('main') or soup.find('div', class_=re.compile(r'content|article|body', re.I))
        text = article.get_text(separator='\n', strip=True) if article else soup.get_text(separator='\n', strip=True)
        return text if len(text) > 200 else ""
    except: return ""

def main():
    now_kst = datetime.now(KST)
    print(f"🚀 핵심 경제 뉴스 5선 수집 엔진 가동 (KST: {now_kst.strftime('%Y-%m-%d %H:%M:%S')})")
    api_call_count = 0

    for url in RSS_FEEDS:
        if api_call_count >= MAX_SUMMARIES_PER_RUN: break
        
        feed = feedparser.parse(url)
        for entry in feed.entries:
            if api_call_count >= MAX_SUMMARIES_PER_RUN: break

            # 💡 '정확히 오늘' 대신 '최근 24시간 이내'로 유연한 필터링 적용
            pub_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
            if pub_parsed:
                entry_date = datetime(*pub_parsed[:6], tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(KST)
                if now_kst - entry_date > timedelta(hours=24):
                    continue # 24시간이 지난 낡은 뉴스는 스킵

            url_hash = hashlib.md5(entry.link.encode('utf-8')).hexdigest()
            filename = os.path.join(OUTPUT_DIR, f"{url_hash}.md")
            if os.path.exists(filename): continue
                
            content = fetch_full_article_content(entry.link) or entry.get('summary', '')
            if not content: continue
            if len(content) > MAX_INPUT_TEXT_CHAR: content = content[:MAX_INPUT_TEXT_CHAR] + "..."

            data = summarize_with_gemini(entry.title, content)
            
            # API 한도 초과 시 루프 즉시 폭파 (안전 장치)
            if data == "QUOTA_EXCEEDED":
                print("🛑 서킷 브레이커 발동: 스크립트 실행을 조기 종료합니다.")
                return 

            if not data: continue
            
            # AI가 무관한 기사로 판별한 경우 스킵
            if data.get('short_desc') == 'IRRELEVANT':
                print(f"⏩ 비경제 기사 필터링됨: {entry.title}")
                continue
                
            api_call_count += 1
            print(f"✅ 주식/경제 뉴스 요약 완료 ({api_call_count}/{MAX_SUMMARIES_PER_RUN}): {entry.title}")
            
            markdown_template = f"""---
title: "{clean_string_for_yaml(entry.title)}"
description: "{clean_string_for_yaml(data['short_desc'])}"
pubDate: {now_kst.strftime('%Y-%m-%d')}
sourceUrl: "{entry.link}"
tags: {json.dumps(data['tags'], ensure_ascii=False)}
---

### 🤖 AI 핵심 요약
1. {data['summary_1']}
2. {data['summary_2']}
3. {data['summary_3']}
"""
            with open(filename, "w", encoding="utf-8") as f: f.write(markdown_template)

    print(f"🏁 수집 종료. 총 {api_call_count}개의 핵심 기사가 적재되었습니다.")

if __name__ == "__main__":
    main()
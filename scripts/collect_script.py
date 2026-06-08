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
# 🛑 [아키텍처 업그레이드 1] 프로덕션 안전 제어 상수
# ==========================================
MAX_SUMMARIES_PER_RUN = 5  # 서킷 브레이커: 1회 실행당 최대 AI 요약 개수 제한 (토큰 방어선)
MAX_INPUT_TEXT_CHAR = 2500  # 데이터 다이어트: AI에게 보낼 최대 기사 글자 수 제한
# ==========================================

# 1. 환경 설정 및 타임존 초기화
KST = zoneinfo.ZoneInfo("Asia/Seoul")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. GitHub Secrets를 확인하세요.")

genai.configure(api_key=GEMINI_API_KEY)
# 가성비 최고이자 무료 한도가 넉넉한 2.5-flash 엔진으로 고정
model = genai.GenerativeModel('gemini-2.5-flash')

# 2. 구조화된 출력을 위한 JSON 스키마 정의
class SummaryResponse(TypedDict):
    short_desc: str
    summary_1: str
    summary_2: str
    summary_3: str
    tags: list[str]

# 수집할 RSS 피드 리스트 (주식 관련 뉴스)
RSS_FEEDS = [
    "https://rss.etoday.co.kr/SectionCode/SectionID.php?secid=6000",
    "https://www.sedaily.com/RSS/seda_05.xml",
    "https://www.hankyung.com/feed/stock",
    "https://news.google.com/rss/search?q=%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko"
]

OUTPUT_DIR = "src/content/blog"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def clean_string_for_yaml(text):
    """Frontmatter 문법 깨짐 방지를 위해 줄바꿈 제거 및 따옴표 이스케이프"""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text.replace('"', '\\"')

def summarize_with_gemini(title, description) -> SummaryResponse:
    """Gemini 2.5 Flash API의 JSON 모드를 이용해 안정적인 구조화 데이터 취득"""
    prompt = f"""
    당신은 테크 및 트렌드 전문 뉴스 요약가입니다. 아래 제공된 뉴스/정보의 제목과 본문 요약을 바탕으로 한국어 요약본을 만들어주세요.

    제목: {title}
    내용: {description}
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=SummaryResponse,
                temperature=0.2
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ Gemini API 호출 또는 JSON 파싱 오류 발생: {e}")
        return None

def main():
    now_kst = datetime.now(KST)
    print(f"🚀 자동 정보 수집 엔진 가동 (KST: {now_kst.strftime('%Y-%m-%d %H:%M:%S')})")

    # API 호출 횟수 추적용 카운터 변수
    api_call_count = 0

    def fetch_full_article_content(url: str) -> str:
        """주어진 URL에서 기사 본문 텍스트를 추출하고 불필요한 공백을 정제합니다."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            for script_or_style in soup(["script", "style", "header", "footer", "nav", ".nav", "#nav", ".header", "#header", ".footer", "#footer"]):
                script_or_style.decompose()

            article_body = soup.find('article') or \
                           soup.find('main') or \
                           soup.find('div', class_=re.compile(r'content|article|post|body', re.I)) or \
                           soup.find('section', class_=re.compile(r'content|article|post|body', re.I))

            if article_body:
                text = article_body.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    return text
            
            full_text = soup.get_text(separator='\n', strip=True)
            if len(full_text) > 200:
                return full_text

            return ""
        except Exception as e:
            print(f"⚠️ 본문 추출 실패 ({url}): {e}")
            return ""

    for url in RSS_FEEDS:
        # [서킷 브레이커 감지] 한 번 배포 주기에 목표한 요약 개수를 채우면 전체 루프 조기 종료
        if api_call_count >= MAX_SUMMARIES_PER_RUN:
            print(f"🛑 이번 실행 주기의 최대 AI 호출 한도({MAX_SUMMARIES_PER_RUN}개)에 도달하여 안전하게 크롤링을 종료합니다.")
            break

        feed = feedparser.parse(url)
        feed_title = feed.feed.get('title', url)
        print(f"📡 수집 중: {feed_title}")
        
        for entry in feed.entries[:8]:  # 후보군을 조금 늘려 당일 기사 매칭 확률 상승
            if api_call_count >= MAX_SUMMARIES_PER_RUN:
                break

            original_url = entry.link
            
            # ------------------------------------------------------------------
            # 🛑 [아키텍처 업그레이드 2] 날짜 필터링 (과거 데이터 원천 배제)
            # ------------------------------------------------------------------
            # 대시보드가 '당일 기사' 위주로 돌아가므로, 크롤러 단에서 과거 기사는 요약 자체를 안 하도록 스킵
            pub_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
            if pub_parsed:
                entry_date = datetime(*pub_parsed[:6], tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(KST)
                # 기사 날짜가 오늘 날짜와 다르면 AI API 호출하기 전에 즉시 스킵
                if entry_date.date() != now_kst.date():
                    continue
            # ------------------------------------------------------------------

            # 중복 수집 방지 파일 체크
            url_hash = hashlib.md5(original_url.encode('utf-8')).hexdigest()
            filename = os.path.join(OUTPUT_DIR, f"{url_hash}.md")
            
            if os.path.exists(filename):
                continue
                
            print(f"🆕 당일 신규 콘텐츠 발견: {entry.title}")
            
            entry_description = entry.get('summary', entry.get('description', ''))
            full_article_text = fetch_full_article_content(original_url)
            content_to_summarize = full_article_text if full_article_text else entry_description
            
            if not content_to_summarize:
                continue

            # ------------------------------------------------------------------
            # 🛑 [아키텍처 업그레이드 3] 데이터 다이어트 (인풋 토큰 한계선 걸기)
            # ------------------------------------------------------------------
            # 본문이 쓸데없이 길면 슬라이싱해서 날려버립니다. 핵심은 상단 2500자 안에 다 들어있습니다.
            if len(content_to_summarize) > MAX_INPUT_TEXT_CHAR:
                content_to_summarize = content_to_summarize[:MAX_INPUT_TEXT_CHAR] + "...(이하 장문 생략)"
            # ------------------------------------------------------------------
                
            # Gemini API 요청 및 카운터 증가
            data = summarize_with_gemini(entry.title, content_to_summarize)
            if not data:
                continue
                
            api_call_count += 1
            print(f"🔥 Gemini API 호출 성공 ({api_call_count}/{MAX_SUMMARIES_PER_RUN})")
            
            safe_title = clean_string_for_yaml(entry.title)
            safe_desc = clean_string_for_yaml(data['short_desc'])
            tags_str = json.dumps(data['tags'], ensure_ascii=False)

            markdown_template = f"""---
title: "{safe_title}"
description: "{safe_desc}"
pubDate: {now_kst.strftime('%Y-%m-%d')}
sourceUrl: "{original_url}"
tags: {tags_str}
---

### 🤖 AI 세 줄 요약
1. {data['summary_1']}
2. {data['summary_2']}
3. {data['summary_3']}
"""
            with open(filename, "w", encoding="utf-8") as f:
                f.write(markdown_template)
            print(f"💾 마크다운 적재 완료: {url_hash}.md")

    print(f"🏁 수집 프로세스 종료. 총 요약본 생성 개수: {api_call_count}개")

if __name__ == "__main__":
    main()
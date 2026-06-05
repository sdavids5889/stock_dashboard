import os
import hashlib
import json
import re
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import zoneinfo
import feedparser
import google.generativeai as genai
from typing_extensions import TypedDict

# 1. 환경 설정 및 타임존 초기화
KST = zoneinfo.ZoneInfo("Asia/Seoul")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. GitHub Secrets를 확인하세요.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# 2. 구조화된 출력을 위한 JSON 스키마 정의 (TypedDict 활용)
class SummaryResponse(TypedDict):
    short_desc: str
    summary_1: str
    summary_2: str
    summary_3: str
    tags: list[str]

# 수집할 RSS 피드 리스트 (주식 관련 뉴스로 변경)
RSS_FEEDS = [
    "https://rss.etoday.co.kr/SectionCode/SectionID.php?secid=6000", # 이투데이 증권
    "https://www.sedaily.com/RSS/seda_05.xml",                       # 서울경제 증권
    "https://www.hankyung.com/feed/stock",                          # 한국경제 증권
    "https://news.google.com/rss/search?q=%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko" # 구글 뉴스 - '주식' 검색
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

    def fetch_full_article_content(url: str) -> str:
        """주어진 URL에서 기사 본문 텍스트를 추출합니다."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()  # HTTP 오류 발생 시 예외 발생

            soup = BeautifulSoup(response.text, 'html.parser')

            # 스크립트, 스타일 등 불필요한 태그 제거
            for script_or_style in soup(["script", "style", "header", "footer", "nav", ".nav", "#nav", ".header", "#header", ".footer", "#footer"]):
                script_or_style.decompose()

            # 기사 본문으로 추정되는 요소들을 우선적으로 찾기
            # 흔히 사용되는 클래스나 태그들을 우선순위로 탐색 (대소문자 구분 없음)
            article_body = soup.find('article') or \
                           soup.find('main') or \
                           soup.find('div', class_=re.compile(r'content|article|post|body', re.I)) or \
                           soup.find('section', class_=re.compile(r'content|article|post|body', re.I))

            if article_body:
                # 찾은 본문 요소 내의 텍스트 추출
                text = article_body.get_text(separator='\n', strip=True)
                # 너무 짧은 텍스트는 유효하지 않다고 판단 (최소 200자 이상)
                if len(text) > 200:
                    return text
            
            # 특정 본문 영역을 찾지 못했다면, 모든 텍스트에서 추출
            full_text = soup.get_text(separator='\n', strip=True)
            if len(full_text) > 200:
                return full_text

            return "" # 적절한 본문을 찾지 못함
        except requests.exceptions.RequestException as e:
            print(f"⚠️ URL 접근 오류 ({url}): {e}")
            return ""
        except Exception as e:
            print(f"⚠️ HTML 파싱 또는 본문 추출 오류 ({url}): {e}")
            return ""

    for url in RSS_FEEDS:
        feed = feedparser.parse(url)
        feed_title = feed.feed.get('title', url)
        print(f"📡 수집 중: {feed_title}")
        
        for entry in feed.entries[:5]:  # 각 피드당 최신 글 5개씩 처리
            original_url = entry.link
            
            # [요구사항] 중복 수집 방지: API 호출 '전'에 파일 존재 여부 1차 체크
            url_hash = hashlib.md5(original_url.encode('utf-8')).hexdigest()
            filename = os.path.join(OUTPUT_DIR, f"{url_hash}.md")
            
            if os.path.exists(filename):
                print(f"⏭️ 이미 수집된 콘텐츠 (스킵): {entry.title}")
                continue
                
            print(f"🆕 새로운 콘텐츠 발견: {entry.title}")
            
            # 요약 데이터 요청
            entry_description = entry.get('summary', entry.get('description', ''))
            
            # 🔗 원문 URL에서 전체 기사 내용을 가져오려고 시도
            full_article_text = fetch_full_article_content(original_url)
            
            # 전체 기사 내용이 있으면 사용하고, 없으면 RSS에서 가져온 요약 사용
            content_to_summarize = full_article_text if full_article_text else entry_description
            
            if not content_to_summarize:
                print(f"⚠️ 요약할 내용이 없습니다. 스킵: {entry.title}")
                continue
                
            data = summarize_with_gemini(entry.title, content_to_summarize)
            if not data:
                continue
                
            # [요구사항] 출력 안정성: Frontmatter 값 안전하게 클리닝 및 이스케이프
            safe_title = clean_string_for_yaml(entry.title)
            safe_desc = clean_string_for_yaml(data['short_desc'])
            tags_str = json.dumps(data['tags'], ensure_ascii=False)

            # [요구사항] 타임존 보정된 Astro 포맷 마크다운 생성
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

if __name__ == "__main__":
    main()

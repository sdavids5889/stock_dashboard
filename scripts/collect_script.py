import os
import hashlib
import json
import re
from datetime import datetime
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

# 수집할 RSS 피드 리스트 (원하는 주소를 자유롭게 추가 가능)
RSS_FEEDS = [
    "https://news.hada.io/rss",                     # GeekNews
    "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko" # 구글 뉴스 헤드라인
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
            data = summarize_with_gemini(entry.title, entry_description)
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
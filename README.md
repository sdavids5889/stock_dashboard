# Astro 대시보드 프로젝트

이 프로젝트는 Astro를 기반으로 한 대시보드 웹사이트로, Gemini API를 사용하여 콘텐츠를 요약하고 자동으로 블로그 게시물을 수집 및 관리하는 Python 스크립트와 통합되어 있습니다.

## 🚀 프로젝트 구조

```text
/
├── .github/workflows/         # GitHub Actions 워크플로우 (예: 자동 콘텐츠 수집)
│   └── auto-collect.yml
├── public/                    # 정적 파일 (파비콘 등)
│   └── favicon.svg
├── scripts/                   # Python 스크립트 및 관련 파일
│   ├── collect_script.py      # 콘텐츠 수집 및 요약 스크립트
│   └── requirements.txt       # Python 의존성
├── src/
│   ├── assets/                # 이미지, SVG 등 정적 자산
│   ├── components/            # Astro 컴포넌트
│   │   └── Welcome.astro
│   ├── content/               # 콘텐츠 컬렉션 (블로그 게시물 등)
│   │   ├── blog/              # Markdown 블로그 게시물
│   │   └── content.config.ts  # 콘텐츠 컬렉션 설정
│   ├── layouts/               # Astro 레이아웃
│   │   └── Layout.astro
│   └── pages/                 # Astro 페이지
│       ├── blog/[...slug].astro # 동적 블로그 페이지
│       └── index.astro         # 메인 인덱스 페이지
├── astro.config.mjs           # Astro 설정 파일
├── package.json               # Node.js 의존성 및 스크립트
├── package-lock.json
├── README.md                  # 이 파일
└── tsconfig.json              # TypeScript 설정 파일
```

## 🛠️ 설정 및 실행 방법

### 전제 조건

*   Node.js (v18 이상 권장)
*   npm (또는 yarn, pnpm)
*   Python (v3.8 이상 권장)
*   Gemini API 키 (콘텐츠 요약 스크립트를 사용하려면 필요)

### 1. 의존성 설치

**Node.js 의존성:**

```bash
npm install
```

**Python 의존성:**

```bash
pip install -r scripts/requirements.txt
```

### 2. 환경 변수 설정

`scripts/collect_script.py` 스크립트가 Gemini API를 사용하려면 API 키가 필요합니다. `GOOGLE_API_KEY` 환경 변수를 설정해야 합니다.

```bash
export GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```

### 3. 프로젝트 실행

**개발 서버 실행 (웹사이트)**

로컬 개발 서버를 시작하고 `localhost:4321`에서 웹사이트를 확인합니다.

```bash
npm run dev
```

**프로덕션 빌드 (웹사이트)**

프로덕션용 정적 웹사이트를 `dist/` 디렉토리에 빌드합니다.

```bash
npm run build
```

빌드된 사이트를 로컬에서 미리 보려면 다음 명령어를 사용하세요:

```bash
npm run preview
```

**콘텐츠 수집 및 요약 스크립트 실행 (Python)**

블로그 콘텐츠를 수집하고 Gemini API를 사용하여 요약하려면 다음 Python 스크립트를 실행합니다. 이 스크립트는 `src/content/blog`에 Markdown 파일을 생성하거나 업데이트할 수 있습니다.

```bash
python scripts/collect_script.py
```

GitHub Actions 워크플로우 (`.github/workflows/auto-collect.yml`)는 이 스크립트를 자동으로 실행하도록 설정될 수 있습니다.

# BlockPixel Studio
**AI 기반 Minecraft 아이템 텍스처 자동 생성 툴**

**버전**: 0.1 (MVP)  
**작성일**: 2026-06-29  
**작성자**: 우준 + Grok  
**상태**: MVP 기획 완료

---

## 1. 개요 (Overview)

BlockPixel Studio는 **텍스트 프롬프트 + 레퍼런스 이미지**를 통해 Minecraft 스타일 아이템 텍스처(16×16, 32×32)를 빠르고 일관되게 생성하는 웹 기반 도구입니다.

기존 AI 이미지 생성기의 단점(스타일 불일치, fake pixel)을 보완하기 위해  
**“그룹/시트 생성 → 스타일 레퍼런스 추출 → 개별 아이템 정밀 생성 + Proper Pixel Art 후처리”** 파이프라인을 핵심으로 합니다.

**슬로건**:  
“커스텀 프롬프트 하나로 일관된 Minecraft 텍스처 세트를 1분 안에”

---

## 2. 비전 & 목표 (Vision & Goals)

### 비전
- Minecraft 모드/리소스팩 제작자가 **디자인 일관성**을 유지하면서 빠르게 텍스처를 제작할 수 있게 한다.
- AI의 창의성과 픽셀 아트의 정밀성을 결합한 **최소한의 강력한 harness** 제공.

### MVP 목표
- 커스텀 프롬프트 중심으로 동작
- 그룹 생성 → 개별 정밀 생성 워크플로우 완성
- Proper Pixel Art 변환 (unfake + proper-pixel-art + Sharp)
- 로컬에서 `pnpm dev`로 바로 실행 가능한 형태

### Non-Goals (MVP 제외)
- 복잡한 Preset (Diamond, Netherite 등 material 선택)
- 커뮤니티 갤러리 / 공유 기능
- 풀 Resource Pack 빌더
- 상용 배포용 무거운 백엔드 (MySQL, Redis Queue 등은 Phase 2)

---

## 3. 타겟 유저

- Minecraft Java Edition 모드/리소스팩 제작자
- 픽셀 아트 초보자 ~ 중급자
- AI 이미지 생성을 Minecraft 스타일에 맞게 활용하고 싶은 개발자/크리에이터

---

## 4. 주요 기능 (MVP Scope)

### Core Features

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **Custom Prompt** | 자유로운 텍스트 입력 (최소 harness) | P0 |
| **Group / Sheet 생성** | 여러 아이템을 한 번에 생성 (스타일 레퍼런스용, 배경 OK) | P0 |
| **Reference Image 활용** | 이전 생성물 또는 업로드 이미지를 스타일 레퍼런스로 사용 | P0 |
| **개별 아이템 정밀 생성** | “이 스타일로 Honey Pickaxe를 32×32로 만들어줘” | P0 |
| **Proper Pixel Art 변환** | AI 출력 → unfake/proper-pixel-art + Sharp 후처리 | P0 |
| **결과 비교 뷰** | Original AI vs Proper Pixel Art side-by-side | P0 |
| **다운로드** | PNG 단일 + ZIP (여러 변형) | P0 |
| **히스토리 (로컬)** | localStorage 또는 generated 폴더에 저장 | P1 |

### 옵션 (접을 수 있는 패널)
- Resolution: 16×16 / 32×32 / 64×64
- Model 선택: GPT Image 2, Nano Banana 2 (드롭다운)
- Variations: 1~4개
- Style 힌트 태그 (빠른 추가)

---

## 5. 사용자 플로우 (User Flow)

### Flow 1: 스타일 레퍼런스 생성 (Group 모드)
1. Prompt 입력: `Minecraft tool set reference sheet: sword, pickaxe, axe...`
2. “Generate as Style Reference” 모드 선택
3. Generate → 큰 시트 이미지 생성
4. 결과 페이지에서 “이 스타일로 새 아이템 만들기” 클릭

### Flow 2: 개별 아이템 생성 (Reference 사용)
1. 새 아이템 이름 입력 (예: Honey Pickaxe)
2. Resolution 선택 (32×32)
3. Reference 이미지 자동/수동 지정
4. Generate → AI가 레퍼런스 스타일 강하게 반영
5. 후처리 적용 → 다운로드

### Flow 3: 결과 활용
- Side-by-side 비교
- “더 강하게 Refine” 버튼 (reference weight 증가)
- ZIP 다운로드 (개별 PNG + metadata.json)

---

## 6. 기술 아키텍처 (MVP)

### Frontend
- **React + Vite + TypeScript**
- 기본 CSS 우선 (Tailwind + shadcn/ui는 디자인 단계에서 검토)
- React 기본 state 우선 (Zustand는 상태 복잡도 증가 시 검토)
- Canvas / react-dropzone (이미지 업로드 및 간단 크롭)

### Backend (간단 Proxy + Processing)
- **Fastify** API 서버
- AI API 호출 (OpenAI / Google Gemini)
- Sharp + proper-pixel-art-ts 후처리
- 로컬 파일 저장 (`/generated` 폴더)

### 실행 방식
```bash
pnpm dev          # frontend + backend 동시 실행
```

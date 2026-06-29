// AI image generation provider interface.

export type ModelInfo = {
  id: string
  displayName: string
  /** OpenRouter 해상도 힌트 등. 없으면 provider 기본값 사용 */
  resolution?: string
  /** 출력 포맷. 기본값 'png'. jpeg만 지원하는 모델은 명시 */
  outputFormat?: 'png' | 'jpeg'
}

export type GenerateImageOptions = {
  // 스타일 reference 이미지 (있을 경우 item 생성 시 첨부)
  referenceImage?: Buffer
  // 텍스트 프롬프트
  prompt: string
  // 사용할 모델 ID (provider마다 다른 모델 목록). 미지정 시 provider 기본값.
  modelId?: string
}

export type GenerateImageResult = {
  // 생성된 이미지 버퍼 (PNG)
  buffer: Buffer
  // provider가 응답한 원본 URL (있을 경우)
  remoteUrl?: string
}

export interface ImageProvider {
  /** provider 고유 ID (레지스트리 키) */
  readonly id: string

  /** 표시명 */
  readonly displayName: string

  /** 사용 가능한 모델 목록 */
  readonly models: readonly ModelInfo[]

  /**
   * 이미지 생성.
   * referenceImage가 있으면 스타일 참조용으로 첨부.
   */
  generate(opts: GenerateImageOptions): Promise<GenerateImageResult>
}


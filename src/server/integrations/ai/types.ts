export interface TextGenerationRequest {
  system?: string;
  prompt: string;
  /** Upper bound on generated tokens. */
  maxTokens?: number;
}

export interface TextGenerationResult {
  text: string;
  /** False when the provider declined the request (e.g. a safety refusal). */
  completed: boolean;
}

export interface AiProvider {
  readonly name: string;
  generateText(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

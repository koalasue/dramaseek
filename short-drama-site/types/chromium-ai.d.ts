interface LanguageDetectorResult { detectedLanguage: string; confidence: number }
interface LanguageDetectorInstance { detect(text: string): Promise<LanguageDetectorResult[]> }
interface TranslatorInstance { translate(text: string): Promise<string> }
declare const LanguageDetector: { availability(): Promise<string>; create(options?: object): Promise<LanguageDetectorInstance> } | undefined;
declare const Translator: { availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>; create(options: { sourceLanguage: string; targetLanguage: string; monitor?: (monitor: EventTarget) => void }): Promise<TranslatorInstance> } | undefined;

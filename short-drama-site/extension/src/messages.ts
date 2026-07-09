export type ExtensionMessage =
  | { type: "START_CAPTURE" }
  | { type: "STOP_CAPTURE" }
  | { type: "CAPTURE_STARTED" }
  | { type: "CAPTURE_ERROR"; error: string }
  | { type: "TRANSCRIPT"; text: string; startedAt: number }
  | { type: "MODEL_STATUS"; status: string; progress?: number };

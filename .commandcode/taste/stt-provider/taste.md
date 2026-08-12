# stt-provider
- Soniox is the preferred STT provider for ClinicAI: cheapest ($0.12/hr), native Hinglish/code-switching support, and real-time transcription (sub-200ms). Confidence: 0.85
- When evaluating STT providers, prioritize: Pakistani language support (Urdu, Punjabi, Pashto, Sindhi) > cost > real-time capability > Hinglish/mixed-language support. Confidence: 0.80
- The user is shifting toward Callrolin as a unified voice vendor (both STT and TTS from one provider), favoring a single-vendor pipeline for Urdu/Hinglish over mixing providers. This is a pragmatic choice: one account, one billing relationship, consistent Urdu quality across both directions. Confidence: 0.35
- Assembly AI is already integrated and should be kept as a free-tier STT fallback alongside Soniox; use it when Soniox is unavailable or for Urdu-only cases where cost matters (Assembly AI gives free credits). Confidence: 0.60

- The user is pragmatic about splitting STT and TTS across different vendors rather than forcing a single-vendor pipeline — if one component doesn't work, they'll use a working alternative for that component while keeping the other on the preferred vendor. "Filhal" (for now) signals a tactical fix; the user may revisit vendor consolidation later but prioritizes forward progress over architectural purity. Confidence: 0.80
- Soniox is the primary STT provider; Whisper (OpenAI) serves as fallback for Pashto/Sindhi which Soniox does not support. Confidence: 0.85
- Prefer managing STT provider configuration through the Platform Admin → LLM Keys UI (same pattern as LLM key management), not environment variables. Confidence: 0.80

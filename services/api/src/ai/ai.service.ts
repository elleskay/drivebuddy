import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type MediaFormat,
} from "@aws-sdk/client-transcribe";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export interface AiAnswer {
  answer: string;
  audio?: { base64: string; format: "mp3" };
}
export interface VoiceAnswer extends AiAnswer {
  transcript: string;
}

// The LLM runs on the Anthropic Claude API (api.anthropic.com), not Bedrock:
// it only needs an API key (ANTHROPIC_API_KEY) and sidesteps AWS Bedrock model
// access / per-account daily quotas entirely. Haiku is the cheap/fast default,
// well-suited to short spoken answers; override via ANTHROPIC_MODEL.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// `||` not `??` so an empty-string env (e.g. an unset GitHub Actions var) falls
// back to the default rather than sending an empty model id.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT =
  "You are DriveBuddy, an in-car voice assistant for drivers in Singapore. " +
  "Answer concisely and conversationally - your replies are read aloud, so keep them to 1-3 short sentences. " +
  "You know about Singapore roads, ERP gantries and pricing, traffic, weather, parking (HDB/URA), fuel/petrol prices, " +
  "and safe-driving guidance. If asked something unrelated to driving, answer briefly and steer back to driving. " +
  "Never give unsafe advice; remind the driver to keep their eyes on the road when relevant.";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly polly = new PollyClient({});
  private readonly transcribe = new TranscribeClient({});
  private readonly s3 = new S3Client({});
  private readonly bucket = process.env.AUDIO_BUCKET;

  /** Ask the LLM a driving question; optionally synthesise speech of the answer. */
  async ask(text: string, speak = false): Promise<AiAnswer> {
    const answer = await this.invokeLlm(text);
    if (!speak) return { answer };
    return { answer, audio: await this.synthesize(answer) };
  }

  /** Transcribe an uploaded clip, answer it, and (optionally) speak the answer. */
  async voice(audioBase64: string, format = "m4a", speak = true): Promise<VoiceAnswer> {
    const transcript = await this.transcribeAudio(audioBase64, format);
    if (!transcript) {
      return { transcript: "", answer: "Sorry, I couldn't make out what you said. Please try again." };
    }
    const answer = await this.invokeLlm(transcript);
    const audio = speak ? await this.synthesize(answer) : undefined;
    return { transcript, answer, audio };
  }

  // ---- LLM (Anthropic Claude API) -----------------------------------------

  private async invokeLlm(text: string): Promise<string> {
    if (!ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException(
        "The AI assistant isn't configured yet - set the ANTHROPIC_API_KEY secret to enable it.",
      );
    }
    try {
      // Node 20's global fetch - no SDK, so nothing ESM-only enters the bundle.
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 400,
          temperature: 0.4,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: text }],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
        if (res.status === 401 || res.status === 403) {
          throw new ServiceUnavailableException(
            "The AI assistant isn't available - the Anthropic API key is missing or invalid.",
          );
        }
        if (res.status === 429) {
          throw new ServiceUnavailableException(
            "The AI assistant is busy right now (rate limit reached). Please try again in a moment.",
          );
        }
        throw new ServiceUnavailableException("The AI assistant is temporarily unavailable.");
      }
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const answer = data.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim();
      return answer || "Sorry, I don't have an answer for that right now.";
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Anthropic call failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("The AI assistant is temporarily unavailable.");
    }
  }

  // ---- Polly ---------------------------------------------------------------

  private async synthesize(text: string): Promise<{ base64: string; format: "mp3" }> {
    try {
      const res = await this.polly.send(
        new SynthesizeSpeechCommand({
          Text: text,
          OutputFormat: "mp3",
          VoiceId: "Joanna",
          Engine: "neural",
        }),
      );
      const bytes = await res.AudioStream!.transformToByteArray();
      return { base64: Buffer.from(bytes).toString("base64"), format: "mp3" };
    } catch (err) {
      // Speech is a nice-to-have layered on the text answer; never fail the
      // request because TTS hiccuped.
      this.logger.error(`Polly synth failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Could not generate speech audio.");
    }
  }

  // ---- Transcribe (batch job on S3) ---------------------------------------

  private async transcribeAudio(audioBase64: string, format: string): Promise<string> {
    if (!this.bucket) {
      throw new ServiceUnavailableException("Voice input isn't configured (no audio bucket).");
    }
    const mediaFormat = (format === "m4a" ? "mp4" : format) as MediaFormat;
    // Deterministic-ish key from content length + a slice (no Date/random in this
    // codebase's constraints isn't an issue at runtime, but keep it simple).
    const jobName = `db-${Buffer.from(audioBase64.slice(0, 24)).toString("hex")}-${audioBase64.length}`;
    const key = `uploads/${jobName}.${format}`;
    const outKey = `transcripts/${jobName}.json`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(audioBase64, "base64"),
        ContentType: `audio/${format}`,
      }),
    );

    await this.transcribe.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        IdentifyLanguage: true,
        LanguageOptions: ["en-US", "en-GB", "zh-CN", "ms-MY", "ta-IN"],
        MediaFormat: mediaFormat,
        Media: { MediaFileUri: `s3://${this.bucket}/${key}` },
        OutputBucketName: this.bucket,
        OutputKey: outKey,
      }),
    );

    // Poll within the API Gateway 29s window. Short clips usually finish < 15s.
    const deadline = Date.now() + 24_000;
    let waitMs = 1500;
    while (Date.now() < deadline) {
      await sleep(waitMs);
      const { TranscriptionJob } = await this.transcribe.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }),
      );
      const status = TranscriptionJob?.TranscriptionJobStatus;
      if (status === "COMPLETED") return this.readTranscript(outKey);
      if (status === "FAILED") {
        this.logger.error(`Transcribe failed: ${TranscriptionJob?.FailureReason}`);
        return "";
      }
      waitMs = Math.min(waitMs + 500, 3000);
    }
    this.logger.warn(`Transcribe timed out for job ${jobName}`);
    return "";
  }

  private async readTranscript(outKey: string): Promise<string> {
    const obj = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: outKey }));
    const json = JSON.parse(await obj.Body!.transformToString()) as {
      results?: { transcripts?: { transcript?: string }[] };
    };
    return json.results?.transcripts?.[0]?.transcript?.trim() ?? "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
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

// Cheap + fast; available in ap-southeast-1. Override via env for Sonnet etc.
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0";

const SYSTEM_PROMPT =
  "You are DriveBuddy, an in-car voice assistant for drivers in Singapore. " +
  "Answer concisely and conversationally - your replies are read aloud, so keep them to 1-3 short sentences. " +
  "You know about Singapore roads, ERP gantries and pricing, traffic, weather, parking (HDB/URA), fuel/petrol prices, " +
  "and safe-driving guidance. If asked something unrelated to driving, answer briefly and steer back to driving. " +
  "Never give unsafe advice; remind the driver to keep their eyes on the road when relevant.";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly bedrock = new BedrockRuntimeClient({});
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

  // ---- Bedrock -------------------------------------------------------------

  private async invokeLlm(text: string): Promise<string> {
    try {
      const res = await this.bedrock.send(
        new InvokeModelCommand({
          modelId: MODEL_ID,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 400,
            temperature: 0.4,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: [{ type: "text", text }] }],
          }),
        }),
      );
      const decoded = JSON.parse(Buffer.from(res.body).toString("utf8")) as {
        content?: { type: string; text?: string }[];
      };
      const answer = decoded.content?.map((c) => c.text ?? "").join("").trim();
      return answer || "Sorry, I don't have an answer for that right now.";
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Bedrock invoke failed: ${message}`);
      if (/AccessDenied|not authorized|could not be found|don't have access|model.*access/i.test(message)) {
        throw new ServiceUnavailableException(
          "The AI assistant isn't available yet - Bedrock model access must be enabled for this AWS account/region.",
        );
      }
      if (/throttl|too many|rate ?exceeded|quota|limit/i.test(message)) {
        throw new ServiceUnavailableException(
          "The AI assistant is busy right now (rate limit reached). Please try again in a moment.",
        );
      }
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

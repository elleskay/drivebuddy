import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;

  /** When true, also return Polly-synthesised speech of the answer. */
  @IsOptional()
  @IsBoolean()
  speak?: boolean;
}

export class VoiceDto {
  /** Base64-encoded audio recorded on-device. */
  @IsString()
  @MaxLength(9_000_000) // ~6.5 MB decoded; API GW caps the request at 10 MB
  audioBase64!: string;

  /** Container/codec of the clip. expo-av records m4a (AAC) by default. */
  @IsOptional()
  @IsIn(["m4a", "mp4", "mp3", "wav", "ogg", "flac", "webm", "amr"])
  format?: string;

  @IsOptional()
  @IsBoolean()
  speak?: boolean;
}

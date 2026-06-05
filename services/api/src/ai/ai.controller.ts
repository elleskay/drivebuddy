import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AiService } from "./ai.service";
import { AskDto, VoiceDto } from "./dto";

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** Text question to LLM answer (+ optional spoken audio). */
  @Post("ask")
  ask(@Body() dto: AskDto) {
    return this.ai.ask(dto.text, dto.speak ?? false);
  }

  /** Recorded audio to transcript to LLM answer to spoken audio. */
  @Post("voice")
  voice(@Body() dto: VoiceDto) {
    return this.ai.voice(dto.audioBase64, dto.format ?? "m4a", dto.speak ?? true);
  }
}

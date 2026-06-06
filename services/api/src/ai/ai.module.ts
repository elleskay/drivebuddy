import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { ExternalModule } from "../external/external.module";

@Module({
  imports: [ExternalModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}

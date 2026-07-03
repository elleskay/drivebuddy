// Serialize BigInt as string in JSON responses (Prisma RoutePoint ids).
(BigInt.prototype as unknown as { toJSON: (this: bigint) => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

// Local / container bootstrap. The Lambda entry point is src/lambda.ts.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // CORS parity with the Lambda entry (src/lambda.ts) so a local web client can
  // call the dev API. Reflects the request origin unless CORS_ORIGIN is set.
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  });
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  new Logger("bootstrap").log(`API listening on :${port}`);
}

void bootstrap();

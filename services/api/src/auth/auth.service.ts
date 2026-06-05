import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./jwt.strategy";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, fullName: dto.fullName, provider: "local" },
    });
    return this.tokensFor(user.id, user.email, user.fullName);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.tokensFor(user.id, user.email, user.fullName);
  }

  /** Refresh by validating the refresh token (same secret, longer-lived). */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }
    return this.tokensFor(user.id, user.email, user.fullName);
  }

  private async tokensFor(id: string, email: string, fullName: string) {
    const payload: JwtPayload = { sub: id, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { expiresIn: "1h" }),
      this.jwt.signAsync(payload, { expiresIn: "30d" }),
    ]);
    return { accessToken, refreshToken, user: { id, email, fullName } };
  }
}

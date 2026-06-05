import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        gender: true,
        dateOfBirth: true,
        homeAddress: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        homeAddress: dto.homeAddress,
      },
    });
    return this.getProfile(userId);
  }
}

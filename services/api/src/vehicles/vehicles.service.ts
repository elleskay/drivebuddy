import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVehicleDto, UpdateVehicleDto } from "./dto/vehicle.dto";

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    });
  }

  async get(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) {
      throw new NotFoundException("Vehicle not found");
    }
    return vehicle;
  }

  getMain(userId: string) {
    return this.prisma.vehicle.findFirst({ where: { userId, isMain: true } });
  }

  async create(userId: string, dto: CreateVehicleDto) {
    const count = await this.prisma.vehicle.count({ where: { userId } });
    // First vehicle is always main; otherwise honour the requested flag.
    const makeMain = count === 0 ? true : (dto.isMain ?? false);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (makeMain) {
          await tx.vehicle.updateMany({ where: { userId, isMain: true }, data: { isMain: false } });
        }
        return tx.vehicle.create({
          data: {
            userId,
            vehicleNumber: dto.vehicleNumber,
            fuelType: dto.fuelType,
            fuelConsumption: new Prisma.Decimal(dto.fuelConsumption),
            isMain: makeMain,
          },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("You already have a vehicle with this number");
      }
      throw e;
    }
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto) {
    await this.get(userId, id); // ownership check
    try {
      return await this.prisma.vehicle.update({
        where: { id },
        data: {
          vehicleNumber: dto.vehicleNumber,
          fuelType: dto.fuelType,
          fuelConsumption:
            dto.fuelConsumption !== undefined ? new Prisma.Decimal(dto.fuelConsumption) : undefined,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("You already have a vehicle with this number");
      }
      throw e;
    }
  }

  async remove(userId: string, id: string) {
    const vehicle = await this.get(userId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.vehicle.delete({ where: { id } });
      // If the removed vehicle was main, promote the next one.
      if (vehicle.isMain) {
        const next = await tx.vehicle.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });
        if (next) {
          await tx.vehicle.update({ where: { id: next.id }, data: { isMain: true } });
        }
      }
    });
    return { deleted: true };
  }

  async setMain(userId: string, id: string) {
    await this.get(userId, id); // ownership check
    await this.prisma.$transaction([
      this.prisma.vehicle.updateMany({ where: { userId, isMain: true }, data: { isMain: false } }),
      this.prisma.vehicle.update({ where: { id }, data: { isMain: true } }),
    ]);
    return this.get(userId, id);
  }
}

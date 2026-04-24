import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { CreateDrawerDto } from './dto/create-drawer.dto';
import { UpdateDrawerDto } from './dto/update-drawer.dto';
import { DrawerEntity } from './entities/drawer.entity';

@Injectable()
export class DrawersService {
  constructor(
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
  ) {}

  findAll(search?: string, branchId?: string) {
    const normalizedSearch = search?.trim();
    const branchFilter = branchId ? { branchId } : {};

    return this.drawerRepository.find({
      where: normalizedSearch
        ? [
            { ...branchFilter, name: ILike(`%${normalizedSearch}%`) },
            { ...branchFilter, code: ILike(`%${normalizedSearch}%`) },
          ]
        : branchFilter,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const drawer = await this.drawerRepository.findOne({ where: { id } });

    if (!drawer) {
      throw new NotFoundException('Drawer was not found.');
    }

    return drawer;
  }

  async create(createDrawerDto: CreateDrawerDto) {
    const code = createDrawerDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);
    await this.ensureBranchExists(createDrawerDto.branchId);
    await this.ensureBranchIsAvailable(createDrawerDto.branchId);

    const drawer = this.drawerRepository.create({
      ...createDrawerDto,
      code,
      isActive: createDrawerDto.isActive ?? true,
      notes: createDrawerDto.notes ?? null,
    });

    return this.drawerRepository.save(drawer);
  }

  async update(id: string, updateDrawerDto: UpdateDrawerDto) {
    const drawer = await this.findByIdOrFail(id);
    const code = updateDrawerDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    if (updateDrawerDto.branchId) {
      await this.ensureBranchExists(updateDrawerDto.branchId);
      await this.ensureBranchIsAvailable(updateDrawerDto.branchId, id);
    }

    Object.assign(drawer, { ...updateDrawerDto, code: code ?? drawer.code });

    return this.drawerRepository.save(drawer);
  }

  async remove(id: string) {
    const drawer = await this.findByIdOrFail(id);
    await this.drawerRepository.remove(drawer);

    return { id };
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingDrawer = await this.drawerRepository.findOne({
      where: { code, ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingDrawer) {
      throw new ConflictException('A drawer with this code already exists.');
    }
  }

  private async ensureBranchExists(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException('Branch was not found.');
    }
  }

  private async ensureBranchIsAvailable(branchId: string, currentId?: string) {
    const existingDrawer = await this.drawerRepository.findOne({
      where: { branchId, ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingDrawer) {
      throw new ConflictException('This branch already has a drawer.');
    }
  }
}

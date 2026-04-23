import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { CreateDrawerDto } from './dto/create-drawer.dto';
import { UpdateDrawerDto } from './dto/update-drawer.dto';
import { DrawerEntity } from './entities/drawer.entity';

@Injectable()
export class DrawersService {
  constructor(
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.drawerRepository.find({
      where: normalizedSearch
        ? [{ name: ILike(`%${normalizedSearch}%`) }, { code: ILike(`%${normalizedSearch}%`) }]
        : undefined,
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

    const drawer = this.drawerRepository.create({
      ...createDrawerDto,
      code,
      isActive: createDrawerDto.isActive ?? true,
    });

    return this.drawerRepository.save(drawer);
  }

  async update(id: string, updateDrawerDto: UpdateDrawerDto) {
    const drawer = await this.findByIdOrFail(id);
    const code = updateDrawerDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
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
}

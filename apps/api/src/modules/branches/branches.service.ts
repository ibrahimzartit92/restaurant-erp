import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchEntity } from './entities/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
  ) {}

  findAll() {
    return this.branchRepository.find({
      order: { name: 'ASC' },
    });
  }

  findById(id: string) {
    return this.branchRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string) {
    const branch = await this.findById(id);
    if (!branch) throw new NotFoundException('Branch was not found.');
    return branch;
  }

  findByCode(code: string) {
    return this.branchRepository.findOne({ where: { code: code.toUpperCase() } });
  }

  async create(createBranchDto: CreateBranchDto) {
    const code = createBranchDto.code?.trim().toUpperCase() || (await this.generateBranchCode(createBranchDto.name));
    const existingBranch = await this.findByCode(code);

    if (existingBranch) {
      throw new ConflictException('A branch with this code already exists.');
    }

    const branch = this.branchRepository.create({
      ...createBranchDto,
      code,
      isActive: createBranchDto.isActive ?? true,
    });

    return this.branchRepository.save(branch);
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.findByIdOrFail(id);
    const code = updateBranchDto.code?.trim().toUpperCase();

    if (code) {
      const existingBranch = await this.branchRepository.findOne({ where: { code, id: Not(id) } });
      if (existingBranch) throw new ConflictException('A branch with this code already exists.');
    }

    Object.assign(branch, {
      ...updateBranchDto,
      code: code ?? branch.code,
      name: updateBranchDto.name ?? branch.name,
      isActive: updateBranchDto.isActive ?? branch.isActive,
    });

    return this.branchRepository.save(branch);
  }

  async remove(id: string) {
    const branch = await this.findByIdOrFail(id);
    try {
      await this.branchRepository.remove(branch);
      return { id, deleted: true };
    } catch {
      branch.isActive = false;
      await this.branchRepository.save(branch);
      return {
        id,
        deleted: false,
        deactivated: true,
        message: 'تم أرشفة الفرع لأنه مرتبط بسجلات تاريخية ولا يمكن حذفه نهائيا.',
      };
    }
  }

  private async generateBranchCode(name: string) {
    const baseCode =
      name
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .slice(0, 20)
        .toUpperCase() || 'BRANCH';
    let code = baseCode;
    let index = 1;

    while (await this.findByCode(code)) {
      index += 1;
      code = `${baseCode}-${index}`;
    }

    return code;
  }
}

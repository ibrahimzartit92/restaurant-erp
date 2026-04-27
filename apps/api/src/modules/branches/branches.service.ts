import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBranchDto } from './dto/create-branch.dto';
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

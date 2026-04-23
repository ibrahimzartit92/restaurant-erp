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
    const code = createBranchDto.code.toUpperCase();
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
}

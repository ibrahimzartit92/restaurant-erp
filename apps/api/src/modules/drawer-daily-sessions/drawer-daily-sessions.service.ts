import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerTransactionsService } from '../drawer-transactions/drawer-transactions.service';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { CloseDrawerDailySessionDto } from './dto/close-drawer-daily-session.dto';
import { CreateDrawerDailySessionDto } from './dto/create-drawer-daily-session.dto';
import { UpdateDrawerDailySessionDto } from './dto/update-drawer-daily-session.dto';
import { DrawerDailySessionEntity, DrawerDailySessionStatus } from './entities/drawer-daily-session.entity';

@Injectable()
export class DrawerDailySessionsService {
  constructor(
    @InjectRepository(DrawerDailySessionEntity)
    private readonly drawerDailySessionRepository: Repository<DrawerDailySessionEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(DrawerTransactionEntity)
    private readonly drawerTransactionRepository: Repository<DrawerTransactionEntity>,
    private readonly drawerTransactionsService: DrawerTransactionsService,
  ) {}

  findAll(filters: { drawerId?: string; branchId?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.drawerDailySessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.drawer', 'drawer')
      .leftJoinAndSelect('session.branch', 'branch')
      .orderBy('session.sessionDate', 'DESC');

    if (filters.drawerId) {
      query.andWhere('session.drawer_id = :drawerId', { drawerId: filters.drawerId });
    }

    if (filters.branchId) {
      query.andWhere('session.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.dateFrom) {
      query.andWhere('session.session_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('session.session_date <= :dateTo', { dateTo: filters.dateTo });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const session = await this.drawerDailySessionRepository.findOne({ where: { id } });

    if (!session) {
      throw new NotFoundException('Drawer daily session was not found.');
    }

    return this.refreshCalculatedBalance(session);
  }

  async findDetails(id: string) {
    const session = await this.findByIdOrFail(id);
    const transactions = await this.drawerTransactionRepository.find({
      where: { drawerId: session.drawerId, transactionDate: session.sessionDate },
      order: { createdAt: 'DESC' },
    });

    return { ...session, transactions };
  }

  async create(createDrawerDailySessionDto: CreateDrawerDailySessionDto) {
    await this.validateReferences(createDrawerDailySessionDto.drawerId, createDrawerDailySessionDto.branchId);
    await this.ensureSessionIsAvailable(createDrawerDailySessionDto.drawerId, createDrawerDailySessionDto.sessionDate);

    const session = this.drawerDailySessionRepository.create({
      ...createDrawerDailySessionDto,
      calculatedBalance: createDrawerDailySessionDto.openingBalance,
      differenceAmount: 0,
      status: DrawerDailySessionStatus.Open,
      notes: createDrawerDailySessionDto.notes ?? null,
    });

    return this.drawerDailySessionRepository.save(session);
  }

  async update(id: string, updateDrawerDailySessionDto: UpdateDrawerDailySessionDto) {
    const session = await this.findByIdOrFail(id);
    const drawerId = updateDrawerDailySessionDto.drawerId ?? session.drawerId;
    const branchId = updateDrawerDailySessionDto.branchId ?? session.branchId;
    const sessionDate = updateDrawerDailySessionDto.sessionDate ?? session.sessionDate;

    await this.validateReferences(drawerId, branchId);
    await this.ensureSessionIsAvailable(drawerId, sessionDate, id);

    Object.assign(session, updateDrawerDailySessionDto);

    return this.refreshCalculatedBalance(await this.drawerDailySessionRepository.save(session));
  }

  async close(id: string, closeDrawerDailySessionDto: CloseDrawerDailySessionDto) {
    const session = await this.findByIdOrFail(id);

    if (session.status === DrawerDailySessionStatus.Closed) {
      throw new BadRequestException('Drawer session is already closed.');
    }

    const calculatedBalance = await this.calculateBalance(session);

    session.closingBalance = closeDrawerDailySessionDto.closingBalance;
    session.calculatedBalance = calculatedBalance;
    session.differenceAmount = this.roundMoney(closeDrawerDailySessionDto.closingBalance - calculatedBalance);
    session.status = DrawerDailySessionStatus.Closed;
    session.notes = closeDrawerDailySessionDto.notes ?? session.notes;

    return this.drawerDailySessionRepository.save(session);
  }

  async remove(id: string) {
    const session = await this.findByIdOrFail(id);
    await this.drawerDailySessionRepository.remove(session);

    return { id };
  }

  private async refreshCalculatedBalance(session: DrawerDailySessionEntity) {
    session.calculatedBalance = await this.calculateBalance(session);

    if (session.closingBalance !== null) {
      session.differenceAmount = this.roundMoney(session.closingBalance - session.calculatedBalance);
    }

    return this.drawerDailySessionRepository.save(session);
  }

  private async calculateBalance(session: DrawerDailySessionEntity) {
    const movement = await this.drawerTransactionsService.calculateMovement(session.drawerId, session.sessionDate);

    return this.roundMoney(session.openingBalance + movement);
  }

  private async validateReferences(drawerId: string, branchId: string) {
    const [drawer, branch] = await Promise.all([
      this.drawerRepository.findOne({ where: { id: drawerId } }),
      this.branchRepository.findOne({ where: { id: branchId } }),
    ]);

    if (!drawer) {
      throw new NotFoundException('Drawer was not found.');
    }

    if (!branch) {
      throw new NotFoundException('Branch was not found.');
    }

    if (drawer.branchId !== branchId) {
      throw new BadRequestException('Drawer branch must match the session branch.');
    }
  }

  private async ensureSessionIsAvailable(drawerId: string, sessionDate: string, currentId?: string) {
    const existingSession = await this.drawerDailySessionRepository.findOne({
      where: { drawerId, sessionDate },
    });

    if (existingSession && existingSession.id !== currentId) {
      throw new ConflictException('This drawer already has a session for this date.');
    }
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}

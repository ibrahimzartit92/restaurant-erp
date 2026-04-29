import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerTransactionsService } from '../drawer-transactions/drawer-transactions.service';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { CloseDrawerDailySessionDto } from './dto/close-drawer-daily-session.dto';
import { CreateDrawerDailySessionDto } from './dto/create-drawer-daily-session.dto';
import { ReconcileDrawerDailySessionDto } from './dto/reconcile-drawer-daily-session.dto';
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

  async findAll(filters: { drawerId?: string; branchId?: string; dateFrom?: string; dateTo?: string }) {
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

    const sessions = await query.getMany();
    return Promise.all(sessions.map((session) => this.enrichSession(session)));
  }

  async dailySummary(filters: { date?: string; drawerId?: string; branchId?: string }) {
    const date = filters.date ?? new Date().toISOString().slice(0, 10);
    const drawerQuery = this.drawerRepository
      .createQueryBuilder('drawer')
      .leftJoinAndSelect('drawer.branch', 'branch')
      .where('drawer.is_active = :isActive', { isActive: true })
      .orderBy('drawer.name', 'ASC');

    if (filters.drawerId) {
      drawerQuery.andWhere('drawer.id = :drawerId', { drawerId: filters.drawerId });
    }

    if (filters.branchId) {
      drawerQuery.andWhere('drawer.branch_id = :branchId', { branchId: filters.branchId });
    }

    const drawers = await drawerQuery.getMany();

    return Promise.all(
      drawers.map(async (drawer) => {
        const session = await this.drawerDailySessionRepository.findOne({
          where: { drawerId: drawer.id, sessionDate: date },
        });

        return this.buildDailySummary(drawer, date, session ?? null);
      }),
    );
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
    const { transactions, movementTotals } = await this.getSessionMovements(session);
    const enrichedSession = this.buildReconciliationSummary(session, movementTotals);
    return {
      ...enrichedSession,
      transactions,
    };
  }

  async create(createDrawerDailySessionDto: CreateDrawerDailySessionDto) {
    await this.validateReferences(createDrawerDailySessionDto.drawerId, createDrawerDailySessionDto.branchId);
    await this.ensureSessionIsAvailable(createDrawerDailySessionDto.drawerId, createDrawerDailySessionDto.sessionDate);
    const drawer = await this.drawerRepository.findOneOrFail({ where: { id: createDrawerDailySessionDto.drawerId } });
    const openingBalance = Number(createDrawerDailySessionDto.openingBalance ?? drawer.defaultOpeningBalance ?? 0);
    const requiredClosingFloat = Number(
      createDrawerDailySessionDto.requiredClosingFloat ?? drawer.defaultCashFloat ?? openingBalance,
    );

    const session = this.drawerDailySessionRepository.create({
      ...createDrawerDailySessionDto,
      openingBalance,
      requiredClosingFloat,
      calculatedBalance: openingBalance,
      differenceAmount: 0,
      status: DrawerDailySessionStatus.Open,
      notes: createDrawerDailySessionDto.notes ?? null,
    });

    return this.drawerDailySessionRepository.save(session);
  }

  async reconcile(reconcileDrawerDailySessionDto: ReconcileDrawerDailySessionDto) {
    await this.validateReferences(reconcileDrawerDailySessionDto.drawerId, reconcileDrawerDailySessionDto.branchId);

    const drawer = await this.drawerRepository.findOneOrFail({ where: { id: reconcileDrawerDailySessionDto.drawerId } });
    const existingSession = await this.drawerDailySessionRepository.findOne({
      where: {
        drawerId: reconcileDrawerDailySessionDto.drawerId,
        sessionDate: reconcileDrawerDailySessionDto.sessionDate,
      },
    });
    const cashFloat = Number(
      reconcileDrawerDailySessionDto.cashFloat ??
        existingSession?.openingBalance ??
        drawer.defaultCashFloat ??
        drawer.defaultOpeningBalance ??
        0,
    );
    const movementTotals = await this.getDrawerMovements(drawer.id, reconcileDrawerDailySessionDto.sessionDate);
    const theoreticalBalance = this.roundMoney(cashFloat + movementTotals.inflows - movementTotals.outflows);
    const actualCashAmount = this.roundMoney(reconcileDrawerDailySessionDto.actualCashAmount);

    const session =
      existingSession ??
      this.drawerDailySessionRepository.create({
        drawerId: drawer.id,
        branchId: reconcileDrawerDailySessionDto.branchId,
        sessionDate: reconcileDrawerDailySessionDto.sessionDate,
      });

    session.openingBalance = cashFloat;
    session.requiredClosingFloat = cashFloat;
    session.calculatedBalance = theoreticalBalance;
    session.closingBalance = actualCashAmount;
    session.differenceAmount = this.roundMoney(actualCashAmount - theoreticalBalance);
    session.status = DrawerDailySessionStatus.Closed;
    session.notes = reconcileDrawerDailySessionDto.notes ?? null;

    return this.enrichSession(await this.drawerDailySessionRepository.save(session));
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
    session.requiredClosingFloat = Number(closeDrawerDailySessionDto.requiredClosingFloat ?? session.requiredClosingFloat);
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

  private async enrichSession(session: DrawerDailySessionEntity) {
    const refreshedSession = await this.refreshCalculatedBalance(session);
    const { movementTotals } = await this.getSessionMovements(refreshedSession);
    return this.buildReconciliationSummary(refreshedSession, movementTotals);
  }

  private async getSessionMovements(session: DrawerDailySessionEntity) {
    const transactions = await this.drawerTransactionRepository.find({
      where: { drawerId: session.drawerId, transactionDate: session.sessionDate },
      order: { createdAt: 'DESC' },
    });
    const movementTotals = this.sumMovementTotals(transactions);

    return { transactions, movementTotals };
  }

  private async getDrawerMovements(drawerId: string, transactionDate: string) {
    const transactions = await this.drawerTransactionRepository.find({
      where: { drawerId, transactionDate },
    });

    return this.sumMovementTotals(transactions);
  }

  private sumMovementTotals(transactions: DrawerTransactionEntity[]) {
    return transactions.reduce(
      (totals, transaction) => {
        if (transaction.direction === 'in') {
          totals.inflows += transaction.amount;
        } else {
          totals.outflows += transaction.amount;
        }

        return totals;
      },
      { inflows: 0, outflows: 0 },
    );
  }

  private async buildDailySummary(drawer: DrawerEntity, sessionDate: string, session: DrawerDailySessionEntity | null) {
    const movementTotals = await this.getDrawerMovements(drawer.id, sessionDate);
    const cashFloat = Number(session?.openingBalance ?? drawer.defaultCashFloat ?? drawer.defaultOpeningBalance ?? 0);
    const summary = this.buildReconciliationSummary(
      {
        id: session?.id ?? null,
        drawerId: drawer.id,
        drawer,
        branchId: drawer.branchId,
        branch: drawer.branch,
        sessionDate,
        openingBalance: cashFloat,
        requiredClosingFloat: cashFloat,
        calculatedBalance: cashFloat,
        closingBalance: session?.closingBalance ?? null,
        differenceAmount: session?.differenceAmount ?? 0,
        status: session?.status ?? DrawerDailySessionStatus.Open,
        notes: session?.notes ?? null,
        createdAt: session?.createdAt ?? new Date(),
        updatedAt: session?.updatedAt ?? new Date(),
      } as DrawerDailySessionEntity,
      movementTotals,
    );

    return {
      ...summary,
      isReconciled: session?.status === DrawerDailySessionStatus.Closed,
    };
  }

  private buildReconciliationSummary(
    session: DrawerDailySessionEntity,
    movementTotals: { inflows: number; outflows: number },
  ) {
    const inflows = this.roundMoney(movementTotals.inflows);
    const outflows = this.roundMoney(movementTotals.outflows);
    const theoreticalBalance = this.roundMoney(session.openingBalance + inflows - outflows);
    const amountToWithdraw = this.roundMoney(
      Math.max((session.closingBalance ?? theoreticalBalance) - session.requiredClosingFloat, 0),
    );

    return {
      ...session,
      calculatedBalance: theoreticalBalance,
      theoreticalBalance,
      movementTotals: { inflows, outflows },
      amountToWithdraw,
      expectedWithdrawalAmount: this.roundMoney(Math.max(theoreticalBalance - session.requiredClosingFloat, 0)),
      actualWithdrawalAmount:
        session.closingBalance === null
          ? null
          : this.roundMoney(Math.max(session.closingBalance - session.requiredClosingFloat, 0)),
      reconciliationDifference:
        session.closingBalance === null ? null : this.roundMoney(session.closingBalance - theoreticalBalance),
    };
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

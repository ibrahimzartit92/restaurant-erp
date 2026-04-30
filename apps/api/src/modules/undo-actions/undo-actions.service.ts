import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UndoActionEntity, UndoActionStatus } from './entities/undo-action.entity';

type UndoHandler = {
  restoreFromUndo(action: UndoActionEntity): Promise<unknown>;
};

@Injectable()
export class UndoActionsService {
  constructor(
    @InjectRepository(UndoActionEntity)
    private readonly undoActionRepository: Repository<UndoActionEntity>,
    private readonly moduleRef: ModuleRef,
  ) {}

  findRecent(limit = 5) {
    return this.undoActionRepository.find({
      where: { status: UndoActionStatus.Pending },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 20),
    });
  }

  async record(action: {
    actionType: string;
    entityType: string;
    entityId: string;
    recordSummary: string;
    snapshot: Record<string, unknown>;
    reverseToVault?: boolean;
    vaultTransactionSourceType?: string | null;
    vaultTransactionSourceId?: string | null;
  }) {
    return this.undoActionRepository.save(
      this.undoActionRepository.create({
        ...action,
        reverseToVault: action.reverseToVault ?? false,
        vaultTransactionSourceType: action.vaultTransactionSourceType ?? null,
        vaultTransactionSourceId: action.vaultTransactionSourceId ?? null,
        status: UndoActionStatus.Pending,
      }),
    );
  }

  async undo(id: string) {
    const action = await this.undoActionRepository.findOne({ where: { id } });

    if (!action) {
      throw new NotFoundException('Undo action was not found.');
    }

    if (action.status !== UndoActionStatus.Pending) {
      throw new BadRequestException('This action was already undone.');
    }

    const handler = await this.resolveHandler(action.entityType);
    await handler.restoreFromUndo(action);
    action.status = UndoActionStatus.Undone;
    action.undoneAt = new Date();

    return this.undoActionRepository.save(action);
  }

  private async resolveHandler(entityType: string): Promise<UndoHandler> {
    const serviceByEntityType = {
      expense: () => import('../expenses/expenses.service').then((module) => module.ExpensesService),
      supplier_payment: () =>
        import('../supplier-payments/supplier-payments.service').then((module) => module.SupplierPaymentsService),
      employee_advance: () =>
        import('../employee-advances/employee-advances.service').then((module) => module.EmployeeAdvancesService),
      employee_penalty: () =>
        import('../employee-penalties/employee-penalties.service').then((module) => module.EmployeePenaltiesService),
      payroll: () => import('../payroll/payroll.service').then((module) => module.PayrollService),
    };
    const loadServiceType = serviceByEntityType[entityType as keyof typeof serviceByEntityType];

    if (!loadServiceType) {
      throw new BadRequestException('This action cannot be undone automatically.');
    }

    const serviceType = await loadServiceType();
    const handler = this.moduleRef.get<UndoHandler>(serviceType, { strict: false });

    if (!handler?.restoreFromUndo) {
      throw new BadRequestException('Undo handler is not available for this action.');
    }

    return handler;
  }
}

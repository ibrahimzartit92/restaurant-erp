import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import {
  ATTACHMENT_ENTITY_TYPES,
  AttachmentEntity,
  type AttachmentEntityType,
} from './entities/attachment.entity';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.xls', '.xlsx']);

const maxFileSizeBytes = 15 * 1024 * 1024;

type UploadedAttachmentFile = {
  originalname: string;
  mimetype: string;
  size?: number;
  buffer: Buffer;
};

@Injectable()
export class AttachmentsService {
  private tableReadyPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(AttachmentEntity)
    private readonly attachmentsRepository: Repository<AttachmentEntity>,
  ) {}

  async findForEntity(entityType: AttachmentEntityType, entityId: string) {
    this.validateEntityType(entityType);
    await this.ensureAttachmentsTable();

    return this.attachmentsRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdOrFail(id: string) {
    await this.ensureAttachmentsTable();
    const attachment = await this.attachmentsRepository.findOne({ where: { id } });

    if (!attachment) {
      throw new NotFoundException('Attachment was not found.');
    }

    return attachment;
  }

  async create(createDto: CreateAttachmentDto, file: UploadedAttachmentFile | undefined) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    this.validateEntityType(createDto.entityType);
    this.validateFile(file);
    await this.ensureAttachmentsTable();

    const uploadDirectory = join(process.cwd(), 'uploads', 'attachments', createDto.entityType, createDto.entityId);
    mkdirSync(uploadDirectory, { recursive: true });

    const safeOriginalName = this.toSafeFileName(file.originalname);
    const storedFileName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
    const storedPath = join(uploadDirectory, storedFileName);
    writeFileSync(storedPath, file.buffer);

    const attachment = this.attachmentsRepository.create({
      entityType: createDto.entityType,
      entityId: createDto.entityId,
      fileName: file.originalname,
      filePath: storedPath,
      fileType: this.fileTypeFromName(file.originalname, file.mimetype),
      fileSize: file.size ?? file.buffer.length ?? null,
      uploadedBy: createDto.uploadedBy ?? null,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.attachmentsRepository.save(attachment);
  }

  async getFileStream(id: string) {
    const attachment = await this.findByIdOrFail(id);

    if (!existsSync(attachment.filePath)) {
      throw new NotFoundException('Attachment file was not found on disk.');
    }

    return {
      attachment,
      stream: createReadStream(attachment.filePath),
      safeName: basename(attachment.fileName),
    };
  }

  private validateEntityType(entityType: string) {
    if (!ATTACHMENT_ENTITY_TYPES.includes(entityType as AttachmentEntityType)) {
      throw new BadRequestException('Unsupported attachment entity type.');
    }
  }

  private validateFile(file: UploadedAttachmentFile) {
    const extension = extname(file.originalname).toLowerCase();

    if (!allowedMimeTypes.has(file.mimetype) && !allowedExtensions.has(extension)) {
      throw new BadRequestException('Only images, PDF, and Excel files are allowed.');
    }

    const size = file.size ?? file.buffer.length;
    if (size > maxFileSizeBytes) {
      throw new BadRequestException('Attachment file size must be 15 MB or less.');
    }
  }

  private toSafeFileName(fileName: string) {
    const extension = extname(fileName);
    const baseName = basename(fileName, extension).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'attachment';
    return `${baseName}${extension.toLowerCase()}`;
  }

  private fileTypeFromName(fileName: string, mimeType?: string) {
    if (mimeType && mimeType !== 'application/octet-stream') {
      return mimeType;
    }

    const extension = extname(fileName).toLowerCase();

    if (['.jpg', '.jpeg'].includes(extension)) {
      return 'image/jpeg';
    }

    if (extension === '.png') {
      return 'image/png';
    }

    if (extension === '.gif') {
      return 'image/gif';
    }

    if (extension === '.webp') {
      return 'image/webp';
    }

    if (extension === '.pdf') {
      return 'application/pdf';
    }

    if (extension === '.xls') {
      return 'application/vnd.ms-excel';
    }

    if (extension === '.xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    return 'application/octet-stream';
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private async ensureAttachmentsTable() {
    if (!this.tableReadyPromise) {
      this.tableReadyPromise = this.createAttachmentsTableIfMissing().catch((error) => {
        this.tableReadyPromise = null;
        throw error;
      });
    }

    await this.tableReadyPromise;
  }

  private async createAttachmentsTableIfMissing() {
    await this.attachmentsRepository.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await this.attachmentsRepository.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type varchar(80) NOT NULL,
        entity_id uuid NOT NULL,
        file_name varchar(255) NOT NULL,
        file_path text NOT NULL,
        file_type varchar(120) NOT NULL,
        file_size integer,
        uploaded_by uuid,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await this.attachmentsRepository.query(
      'CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id)',
    );
  }
}

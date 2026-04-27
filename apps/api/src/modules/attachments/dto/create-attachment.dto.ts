import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ATTACHMENT_ENTITY_TYPES, type AttachmentEntityType } from '../entities/attachment.entity';

export class CreateAttachmentDto {
  @IsIn(ATTACHMENT_ENTITY_TYPES)
  entityType!: AttachmentEntityType;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @IsUUID()
  uploadedBy?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

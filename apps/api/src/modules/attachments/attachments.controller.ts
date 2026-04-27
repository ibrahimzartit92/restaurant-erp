import { Body, Controller, Get, Header, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import type { AttachmentEntityType } from './entities/attachment.entity';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  findForEntity(@Query('entity_type') entityType: AttachmentEntityType, @Query('entity_id') entityId: string) {
    return this.attachmentsService.findForEntity(entityType, entityId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  create(
    @UploadedFile()
    file:
      | {
          originalname: string;
          mimetype: string;
          size?: number;
          buffer: Buffer;
        }
      | undefined,
    @Body() createDto: CreateAttachmentDto,
  ) {
    return this.attachmentsService.create(createDto, file);
  }

  @Get(':id/preview')
  @Header('X-Content-Type-Options', 'nosniff')
  async preview(@Param('id') id: string, @Res() response: any) {
    const { attachment, stream } = await this.attachmentsService.getFileStream(id);

    response.setHeader('Content-Type', attachment.fileType);
    response.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
    stream.pipe(response);
  }

  @Get(':id/download')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(@Param('id') id: string, @Res() response: any) {
    const { attachment, stream } = await this.attachmentsService.getFileStream(id);

    response.setHeader('Content-Type', attachment.fileType);
    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
    stream.pipe(response);
  }
}

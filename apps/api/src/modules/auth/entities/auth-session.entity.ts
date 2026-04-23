export class AuthSessionEntity {
  id!: string;
  userId!: string;
  accessToken!: string;
  expiresIn!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

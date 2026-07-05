import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export const INVITE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;

export class InviteMemberDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiProperty({ enum: INVITE_ROLES }) @IsEnum(INVITE_ROLES) role!: (typeof INVITE_ROLES)[number];
}

export class AssignRoleDto {
  @ApiProperty({ enum: INVITE_ROLES }) @IsEnum(INVITE_ROLES) role!: (typeof INVITE_ROLES)[number];
}

export class AcceptInviteDto {
  @ApiProperty() @IsString() token!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password!: string;
}

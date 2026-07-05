import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(1) currentPassword!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) newPassword!: string;
}

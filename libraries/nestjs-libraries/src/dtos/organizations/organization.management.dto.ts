import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Role, SubscriptionTier } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString()
  @Length(2, 128)
  name: string;
}

export class JoinOrganizationDto {
  @IsString()
  @MinLength(1)
  organizationId: string;
}

export class InviteOrganizationMemberDto {
  @IsEmail()
  email: string;

  @IsIn([Role.ADMIN, Role.USER])
  role: Role;
}

export class UpdateOrganizationMemberRoleDto {
  @IsIn([Role.ADMIN, Role.USER])
  role: Role;
}

export class UpdateOrganizationMemberPagesDto {
  @IsArray()
  @ArrayUnique()
  integrationIds: string[];
}

export class OrganizationPostRequestDto {
  @IsString()
  @MinLength(1)
  videoUrl: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsString()
  @MinLength(1)
  pageId: string;

  @IsOptional()
  @IsDateString()
  uploadDate?: string;

  @IsOptional()
  @Matches(/^([0-5]?[0-9]):([0-5][0-9])$/, {
    message: 'thumbnailTimestamp must be in mm:ss format',
  })
  thumbnailTimestamp?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class ManualSubscriptionUpdateDto {
  @IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE'])
  tier: SubscriptionTier;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalChannels?: number;

  @IsOptional()
  isLifetime?: boolean;
}

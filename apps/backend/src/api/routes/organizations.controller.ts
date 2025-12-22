import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import {
  CreateOrganizationDto,
  InviteOrganizationMemberDto,
  JoinOrganizationDto,
  ManualSubscriptionUpdateDto,
  OrganizationPostRequestDto,
  UpdateOrganizationMemberPagesDto,
  UpdateOrganizationMemberRoleDto,
} from '@gitroom/nestjs-libraries/dtos/organizations/organization.management.dto';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { User } from '@prisma/client';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

@ApiTags('Organizations')
@Controller('/organizations')
export class OrganizationsController {
  constructor(
    private _organizationService: OrganizationService,
    private _integrationService: IntegrationService,
    private _subscriptionService: SubscriptionService
  ) {}

  @Post('/')
  async createOrganization(
    @GetUserFromRequest() user: User,
    @Body() body: CreateOrganizationDto
  ) {
    return this._organizationService.createOrgForUser(user.id, body.name);
  }

  @Post('/join')
  async joinOrganization(
    @GetUserFromRequest() user: User,
    @Body() body: JoinOrganizationDto
  ) {
    const organization = await this._organizationService.getOrgById(
      body.organizationId
    );
    if (!organization) {
      throw new HttpForbiddenException();
    }
    await this._organizationService.joinOrganization(
      user.id,
      body.organizationId
    );
    return { joined: true };
  }

  @Get('/:id/members')
  async getMembers(
    @Param('id') id: string,
    @GetOrgFromRequest() org: any
  ) {
    this._ensureSameOrg(org, id);
    this._ensureAdmin(org);
    return this._organizationService.getTeam(org.id);
  }

  @Post('/:id/members')
  async inviteMember(
    @Param('id') id: string,
    @Body() body: InviteOrganizationMemberDto,
    @GetOrgFromRequest() org: any
  ) {
    this._ensureSameOrg(org, id);
    this._ensureAdmin(org);
    const added = await this._organizationService.addExistingUserByEmail(
      org.id,
      body.email,
      body.role
    );
    if (!added) {
      throw new HttpForbiddenException();
    }
    return added;
  }

  @Patch('/:id/members/:memberId')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateOrganizationMemberRoleDto,
    @GetOrgFromRequest() org: any
  ) {
    this._ensureSameOrg(org, id);
    this._ensureAdmin(org);
    return this._organizationService.updateMemberRole(memberId, body.role);
  }

  @Patch('/:id/members/:memberId/pages')
  async updateMemberPages(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateOrganizationMemberPagesDto,
    @GetOrgFromRequest() org: any
  ) {
    this._ensureSameOrg(org, id);
    this._ensureAdmin(org);
    return this._organizationService.setMemberPermissions(
      memberId,
      body.integrationIds
    );
  }

  @Get('/:id/pages')
  async getPages(@Param('id') id: string, @GetOrgFromRequest() org: any) {
    this._ensureSameOrg(org, id);
    const integrations = await this._integrationService.getIntegrationsList(
      org.id
    );
    const member = org.users?.[0];
    const allowed =
      member?.pagePermissions?.map((permission) => permission.integrationId) ||
      [];
    const role = member?.role;
    const filtered =
      role === 'USER' && allowed.length
        ? integrations.filter((integration) =>
            allowed.includes(integration.id)
          )
        : integrations;

    return {
      pages: filtered.map((integration) => ({
        id: integration.id,
        name: integration.name,
        provider: integration.providerIdentifier,
      })),
    };
  }

  @Get('/:id/form-config')
  async getFormConfig(@Param('id') id: string, @GetOrgFromRequest() org: any) {
    this._ensureSameOrg(org, id);
    const tier = org?.subscription?.subscriptionTier || 'STANDARD';
    return {
      tier,
      showTypeField: tier !== 'STANDARD',
    };
  }

  @Post('/:id/form-submit')
  async submitForm(
    @Param('id') id: string,
    @Body() body: OrganizationPostRequestDto,
    @GetOrgFromRequest() org: any
  ) {
    this._ensureSameOrg(org, id);
    await this._ensureUserCanPostToIntegration(org, body.pageId);
    return {
      accepted: true,
      payload: body,
    };
  }

  @Patch('/:id/subscription')
  async manualSubscriptionUpdate(
    @Param('id') id: string,
    @Body() body: ManualSubscriptionUpdateDto,
    @GetOrgFromRequest() org: any
  ) {
    this._ensureSameOrg(org, id);
    this._ensureAdmin(org);
    await this._subscriptionService.manualUpdateSubscription(
      org.id,
      body.tier,
      body.totalChannels,
      body.isLifetime
    );

    return { updated: true };
  }

  private _ensureSameOrg(org: any, id: string) {
    if (!org || org.id !== id) {
      throw new HttpForbiddenException();
    }
  }

  private _ensureAdmin(org: any) {
    const role = org?.users?.[0]?.role;
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      throw new HttpForbiddenException();
    }
  }

  private async _ensureUserCanPostToIntegration(
    org: any,
    integrationId: string
  ) {
    const member = org?.users?.[0];
    const role = member?.role;
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      return true;
    }

    const allowed =
      member?.pagePermissions?.map((permission) => permission.integrationId) ||
      [];

    if (allowed.length === 0 || allowed.includes(integrationId)) {
      return true;
    }

    throw new HttpForbiddenException();
  }
}

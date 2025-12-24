import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User } from '@prisma/client';

@ApiTags('Admin')
@Controller('/admin')
export class AdminController {
  constructor(private _postsService: PostsService) {}

  @Get('/errors')
  async getErrors(
    @GetUserFromRequest() user: User,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25'
  ) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    return this._postsService.getAdminErrors(Number(page), Number(pageSize));
  }
}

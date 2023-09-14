import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';
import { Role } from '../entities/role.enum';
import { UserEntity } from '../../users/entities/user.entity';
import { ErrorMessage } from '../../common/constants/messages';
import { AzureUsersService } from 'src/users/azure-users.service';
const FRONTEND_URL = process.env.FRONTEND_URL;

@Injectable()
export class AzureAdGuard extends AuthGuard('azure-ad') {
  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(context)) as boolean;
    return result;
  }
}

@Injectable()
export class AzureAdGuardForStaffs extends AuthGuard('azure-ad-for-staffs') {
  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(context)) as boolean;
    return result;
  }
}

@Injectable()
export class BearerGuard extends AuthGuard('bearer') {
  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(context)) as boolean;
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      if (!req.isAuthenticated()) {
        throw new UnauthorizedException();
      }
    }
    return result;
  }
}

@Injectable()
export class AzureADAuthGuardLogin extends AuthGuard('bearer') {
  constructor(private readonly azureUsersService: AzureUsersService) {
    super();
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const role = Role.USER;
    const token = request.body.id_token;
    const decodedToken = jwt.decode(token, {
      complete: true,
    });
    request.code = request.body.code;
    if (!decodedToken) return false;
    const azureOid = decodedToken.payload.oid || decodedToken.payload.sub;
    const email = decodedToken.payload.email;
    const active = true;
    const firstName = decodedToken.payload.given_name || '';
    const lastName = decodedToken.payload.family_name || '';
    const displayName = decodedToken.payload.name || '';

    // Check azureOid
    let _user = await this.azureUsersService.findByAzureOid(azureOid);

    const userProfile = {
      email,
      active,
      azureOid,
      firstName,
      lastName,
      displayName,
    };
    if (!_user) {
      _user = await this.azureUsersService.create({
        ...userProfile,
        role: role,
      });
    }
    if (!_user.active) {
      return response.redirect(`${FRONTEND_URL}#USER_NOT_ACTIVE`);
    }
    if (_user.role !== role) {
      return response.redirect(`${FRONTEND_URL}#INVALID_ROLE`);
    }
    request.userProfile = userProfile;
    request.azureOid = azureOid;
    request.token = token;
    const user: UserEntity = request.userProfile;
    request.user = user;
    request.user.id = _user.id;

    await super.logIn(request);
    return true;
  }
}

@Injectable()
export class AzureADAuthGuardLoginForStaffs extends AuthGuard('bearer') {
  constructor(private readonly azureUsersService: AzureUsersService) {
    super();
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const role = Role.STAFF;
    const token = request.body.id_token;
    const decodedToken = jwt.decode(token, {
      complete: true,
    });
    request.code = request.body.code;
    if (!decodedToken) return false;
    const azureOid = decodedToken.payload.oid || decodedToken.payload.sub;
    const email = decodedToken.payload.email;
    const active = true;
    const firstName = decodedToken.payload.given_name || '';
    const lastName = decodedToken.payload.family_name || '';
    const displayName = decodedToken.payload.name || '';

    // Check azureOid
    let _user = await this.azureUsersService.findByAzureOid(azureOid);

    const userProfile = {
      email,
      active,
      azureOid,
      firstName,
      lastName,
      displayName,
    };
    if (!_user) {
      _user = await this.azureUsersService.create({
        ...userProfile,
        role: role,
      });
    }
    if (!_user.active) {
      return response.redirect(`${FRONTEND_URL}?userInactive=true`);
    }
    if (_user.role !== role) {
      return response.redirect(`${FRONTEND_URL}?invalidRole=true`);
    }
    request.userProfile = userProfile;
    request.azureOid = azureOid;
    request.token = token;
    const user: UserEntity = request.userProfile;
    request.user = user;
    request.user.id = _user.id;

    await super.logIn(request);
    return true;
  }
}

import { Get, JsonController, QueryParam } from 'routing-controllers';
import database from '../../utils/database';
import { Roles } from '../auth/interfaces/auth';
import authService from '../auth/service';

const path = 'general';
const GEN_SECRET = 'dijMz13OsM';

@JsonController()
class GeneralController {
  @Get(`/${path}/superadmin`)
  async superadmin(@QueryParam('secret') secret: string) {
    if (secret !== GEN_SECRET) throw new Error('Unknown error.');

    const body = { email: 'superadmin@gmail.com', password: '123456',
      role: Roles.superAdmin, name: 'super-admin', phone: '0', defaultLanguage: null, };
    const result = await (new authService()).registration(body);

    return { status: 'success', data: result };
  }

  @Get(`/${path}/reset`)
  async reset(@QueryParam('secret') secret: string) {
    if (secret !== GEN_SECRET) throw new Error('Unknown error.');
    await database.reset();
    return { status: 'success' };
  }
}

export default GeneralController;
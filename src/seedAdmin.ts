import * as users from './repos/usersRepo.js';

const admin = await users.findByUsername('admin');
if (!admin) {
  await users.createUser('admin', 'admin123', ['admin']);
  console.log('admin user created');
}

import { FastifyInstance } from 'fastify';
import { UserController } from '../../controllers/users/UserController';

const userController = new UserController();

export async function user_routes(fastify: FastifyInstance) {
  fastify.post('/users', userController.registerUser);
  fastify.get('/users/me', userController.getUser);
  fastify.put('/users/update', userController.updateUser);   
  fastify.delete('/users/delete', userController.deleteUser); 
}

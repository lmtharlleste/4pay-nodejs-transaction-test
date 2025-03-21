import { FastifyInstance } from "fastify";
import { AuthController } from "../../controllers/users/AuthController";

const authController = new AuthController();

export async function auth_routes(fastify: FastifyInstance) {
  fastify.post('/login', authController.login);
  fastify.post('/verify-token', authController.verifyToken);
}

import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET_KEY as string;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET_KEY is not defined in the environment variables."
  );
}

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      console.log(user);
      console.log(email);
      if (!user) {
        return reply.status(401).send({ message: "Usuário não encontrado!" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.status(401).send({ message: "Senha incorreta!" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "1h",
      });

      return reply.send({
        token,
        expiresIn: "1h",
        tokenType: "Bearer",
      });
    } catch (error) {
      return reply.status(500).send({ message: "Erro no login", error });
    }
  }

  async verifyToken(request: FastifyRequest, reply: FastifyReply) {
    const { token } = request.body as { token: string };

    if (!token) {
      return reply.status(400).send({ message: "Token não fornecido!" });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const expirationDate = new Date(decoded.exp * 1000);

      return reply.send({
        tokenType: "Bearer",
        expirationDate,
        userId: decoded.id,
      });
    } catch (error) {
      return reply.status(401).send({ message: "Token inválido ou expirado!" });
    }
  }
}

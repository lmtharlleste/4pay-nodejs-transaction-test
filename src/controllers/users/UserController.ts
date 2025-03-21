import { FastifyRequest, FastifyReply } from "fastify";
import { UserValidation } from "../../validations/userValidation";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET_KEY as string;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET_KEY is not defined in the environment variables."
  );
}

class UserController {
  async registerUser(request: FastifyRequest, reply: FastifyReply) {
    const parsedData = UserValidation.validateUserData(request.body);

    if (!parsedData.success) {
      const formattedErrors: Record<string, string> = {};
      parsedData.error.errors.forEach((err) => {
        const field = err.path[0];
        formattedErrors[field] = err.message;
      });

      return reply.status(400).send({ error: formattedErrors });
    }

    const { email, telefone, idade, password } = parsedData.data;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          telefone,
          idade,
          password: hashedPassword,
        },
      });

      return reply.status(201).send(user);
    } catch (error) {
      return reply.status(500).send({ error: "Erro ao registrar usuário" });
    }
  }

  async getUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: "Token não fornecido!" });
      }

      const token = authHeader.split(" ")[1]; 

      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

      if (!decoded.id) {
        return reply.status(401).send({ error: "Token inválido!" });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          telefone: true,
          idade: true,
          balance: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado!" });
      }

      return reply.send({
        ...user,
        balance: user.balance.toNumber(), 
      });
    } catch (error) {
      return reply.status(401).send({ error: "Token inválido ou expirado!" });
    }
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Extrai o token do header
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: "Token não fornecido!" });
      }
  
      // Separa o 'Bearer' do token
      const token = authHeader.split(" ")[1]; 
  
      // Verifica o token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

      if (!decoded.id) {
        return reply.status(401).send({ error: "Token inválido!" });
      }
  
      // Valida os dados do corpo da requisição
      const parsedBody = UserValidation.validateUserData(request.body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: parsedBody.error?.errors,
        });
      }
  
      const { email, telefone, idade, password } = parsedBody.data;
  
      // Atualiza o usuário no banco de dados
      const user = await prisma.user.update({
        where: { id: decoded.id },
        data: {
          email,
          telefone,
          idade,
          password, // Se a senha for fornecida, será atualizada
        },
      });
  
      return reply.status(200).send(user);
  
    } catch (error) {
      console.log(error);
      return reply.status(500).send({ error: "Erro ao atualizar usuário" });
    }
  }

  async  deleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Extraindo o token do header Authorization
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: "Token não fornecido!" });
      }
  
      const token = authHeader.split(" ")[1]; // Pegando o token do header
  
      // Verificando e decodificando o token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      if (!decoded.id) {
        return reply.status(401).send({ error: "Token inválido!" });
      }
  
      // Tentando deletar o usuário no banco de dados com base no ID do token
      const user = await prisma.user.delete({
        where: { id: decoded.id }, // Usando o ID do token
      });
  
      // Retorna mensagem de sucesso após a exclusão
      return reply.status(200).send({ message: "Usuário deletado com sucesso", user });
    } catch (error) {
      return reply.status(500).send({ error: "Erro ao deletar usuário" });
    }
  }
}

export { UserController };

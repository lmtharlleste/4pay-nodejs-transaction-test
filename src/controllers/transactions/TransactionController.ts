import { FastifyReply, FastifyRequest } from "fastify";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { z } from "zod";
import TransactionService from '../../services/createTransaction.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET_KEY as string;

export class TransactionController {
  // 📌 Validação do Zod para valores
  private static transactionSchema = z.object({
    valor: z.number().positive("O valor deve ser positivo!")
  });

  // 🔒 Método para obter o usuário autenticado pelo token
  private async getAuthenticatedUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) return reply.status(401).send({ error: "Token não fornecido!" });

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return reply.status(404).send({ error: "Usuário não encontrado!" });

      return user;
    } catch {
      return reply.status(401).send({ error: "Token inválido!" });
    }
  }

  // 🏦 Método para depósito
  async deposit(request: FastifyRequest, reply: FastifyReply) {
    const parsedData = TransactionController.transactionSchema.safeParse(request.body);
    if (!parsedData.success) {
      // Extrair apenas a primeira mensagem de erro do Zod
      const errorMessage = parsedData.error.errors[0]?.message || 'Erro desconhecido';
      return reply.status(400).send({ error: errorMessage });
    }
  
    const { valor } = parsedData.data;
    const user = await this.getAuthenticatedUser(request, reply);
    if (!user) return;
  
    try {
      // Criar a transação de depósito
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          amount: valor,
        },
      });
  
      // Atualizar saldo do usuário
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: valor } },
        select: { balance: true },
      });
  
      const formattedDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
  
      // Criar o extrato (Statement) para o depósito
      await prisma.statement.create({
        data: {
          transactionId: transaction.id,
          description: `Depósito de R$ ${valor.toFixed(2)} realizado com sucesso. ${formattedDate}.`
        },
      });
  
      return reply.send({
        message: "Depósito realizado com sucesso!",
        balance: updatedUser.balance,
        transactionId: transaction.id,
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: "Erro ao processar depósito!" });
    }
  }
  
  
  
  // 💸 Método para saque// 💸 Método para saque
  async withdraw(request: FastifyRequest, reply: FastifyReply) {
    const parsedData = TransactionController.transactionSchema.safeParse(request.body);
    if (!parsedData.success) {
      return reply.status(400).send({ error: parsedData.error.errors[0]?.message || "Erro desconhecido" });
    }
  
    const { valor } = parsedData.data;
    const user = await this.getAuthenticatedUser(request, reply);
    if (!user) return;
  
    // Verificar se o usuário tem saldo suficiente
    if (user.balance.toNumber() < valor) {
      return reply.status(400).send({
        error: `Saldo insuficiente! Você possui R$ ${user.balance.toFixed(2)} em sua conta.`,
      });
    }
  
    try {
      // Enviar a transação para a fila de processamento
      await TransactionService.createTransaction(user.id, "WITHDRAW", valor);
  
      // Resposta informando que o saque está em processamento
      return reply.send({
        message: "Saque em processamento! Aguarde alguns minutos e você receberá um extrato informando o status da ação.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao processar saque!";
      return reply.status(400).send({ error: errorMessage });
    }
  }
  
  


  // 📜 Método para obter extrato financeiro
  async getStatement(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        select: { id: true, amount: true, type: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ transactions });
    } catch (error) {
      return reply.status(500).send({ error: "Erro ao buscar extrato!" });
    }
  }
}

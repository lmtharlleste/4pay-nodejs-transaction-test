// src/services/TransactionService.ts
import { PrismaClient, TransactionType } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const prisma = new PrismaClient();
const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

// Criando a fila de saques
const withdrawQueue = new Queue("withdrawQueue", { connection });

class TransactionService {
  async createTransaction(userId: string, type: TransactionType, amount: number) {
    if (amount <= 0) {
      throw new Error("O valor da transação deve ser maior que zero.");
    }

    if (type === "WITHDRAW") {
      // Coloca o saque na fila
      await withdrawQueue.add("withdraw", { userId, amount });
      return { message: "Saque em processamento." };
    }

    // Se não for saque, realiza a transação normalmente
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const newBalance = user.balance.add(amount);
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      const transaction = await tx.transaction.create({
        data: { userId, type, amount },
      });

      await this.createStatement(transaction.id, `Transação de ${type} no valor de ${amount}`);
      return transaction;
    });
  }

  async createStatement(transactionId: string, description: string) {
    return await prisma.statement.create({
      data: { transactionId, description },
    });
  }
}

// Worker para processar os saques da fila
new Worker("withdrawQueue", async (job) => {
  const { userId, amount } = job.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Verificar se o usuário existe e tem saldo suficiente
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.balance.toNumber() < amount) {
        throw new Error("Saldo insuficiente!");
      }

      // Subtrair o valor do saldo do usuário
      const newBalance = user.balance.sub(amount);
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      // Criar a transação
      const transaction = await tx.transaction.create({
        data: { userId, type: "WITHDRAW", amount },
      });

      const formattedDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // Agora criamos o Statement usando o transactionId válido
      await tx.statement.create({
        data: { transactionId: transaction.id,  description: `Saque no valor de R$ ${amount.toFixed(2)} realizado com sucesso. ${formattedDate}.`, },
      });
    });

    console.log("Withdrawal processed successfully for user", userId); // Log de sucesso
  } catch (error) {
    console.error("Error processing withdrawal", error);
  }
}, { connection });



export default new TransactionService();

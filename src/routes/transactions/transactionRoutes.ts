import { FastifyInstance } from "fastify";
import { TransactionController } from "../../controllers/transactions/TransactionController";

export async function transaction_routes(app: FastifyInstance) {
  const transactionController = new TransactionController();

  app.post("/deposit", transactionController.deposit.bind(transactionController));
  app.post("/withdraw", transactionController.withdraw.bind(transactionController));
  app.get("/statement", transactionController.getStatement.bind(transactionController));
}

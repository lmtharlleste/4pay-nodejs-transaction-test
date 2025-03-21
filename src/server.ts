import fastify from "fastify";
import { user_routes } from './routes/users/user_routes'; 
import { auth_routes } from "./routes/users/auth_routes";
import { transaction_routes } from "./routes/transactions/transactionRoutes";

export const app = fastify({ logger: true });


app.register(user_routes);  
app.register(auth_routes);
app.register(transaction_routes);

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening on ${address}`);
});
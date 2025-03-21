import { z } from 'zod';

class UserValidation {
  static email() {
    return z.string().email('O e-mail deve ser válido');
  }

  static telefone() {
    return z
      .string()
      .min(10, 'O telefone deve ter pelo menos 10 caracteres')
      .max(15, 'O telefone não pode ter mais que 15 caracteres');
  }

  static idade() {
    return z
      .number()
      .int('A idade deve ser um número inteiro')
      .min(18, 'A idade mínima é 18 anos');
  }

  static senha() {
    return z
      .string()
      .min(6, 'A senha deve ter pelo menos 6 caracteres')
      .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'A senha deve conter pelo menos um número');
  }

  static balance() {
    return z
      .number()
      .min(0, 'O saldo não pode ser menor que 0')
      .transform((val) => parseFloat(val.toFixed(2)));
  }

  static idSchema() {
    return z.object({
      id: z.string().uuid('ID deve ser um UUID válido'),
    });
  }

  static validateUserData(data: any) {
    const schema = z.object({
      email: UserValidation.email(),
      telefone: UserValidation.telefone(),
      idade: UserValidation.idade(),
      password: UserValidation.senha(),
      balance: UserValidation.balance().optional(),
    });

    return schema.safeParse(data);
  }
}

export { UserValidation };

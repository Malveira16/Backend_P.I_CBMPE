import { userRepository } from "../repositories/User.repository";
import { User } from "../entities/User";
import { auditService } from "./Audit.service";

export class UserService {
  async create(
    userdata: Omit<User, "matricula">, 
    auditContext?: { request_id?: string, actor_ip?: string, actor_user_agent?: string } 
  ): Promise<User> {
    try {
    const lastUser = await userRepository.
      createQueryBuilder("user")
      .orderBy("user.matricula", "DESC")
      .getOne();

      const nextNumber = lastUser
         ? Number(lastUser.matricula.replace(/\D/g, '')) + 1
          : 1;

          const prefix = "CBMPE";

          const matricula = `${prefix}${nextNumber.toString().padStart(5, '0')}`;

          const newUser = userRepository.create({
            ...userdata,
            matricula,
          });

          const savedUser = await userRepository.save(newUser);

  // ✅ AUDITORIA: Loga SUCESSO na criação
      await auditService.logEvent({
        request_id: auditContext?.request_id,
        event_type: 'user_management',
        actor: {
          ip: auditContext?.actor_ip,
          user_agent: auditContext?.actor_user_agent
        },
        action: 'create_user',
        resource: 'User',
        resource_id: savedUser.matricula,
        outcome: 'success',
        changes: {
          before: null, // Usuário não existia antes
          after: {
            matricula: savedUser.matricula,
            nome: savedUser.nome,
            email: savedUser.email,
            patente: savedUser.patente,
            funcao: savedUser.funcao
            // Senha NÃO é logada (será mascarada automaticamente)
          }
        }
      });

      return savedUser;
    } catch (error: any) {
      // ❌ AUDITORIA: Loga ERRO na criação
      await auditService.logEvent({
        request_id: auditContext?.request_id,
        event_type: 'user_management',
        actor: {
          ip: auditContext?.actor_ip,
          user_agent: auditContext?.actor_user_agent
        },
        action: 'create_user',
        resource: 'User',
        outcome: 'error',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return await userRepository.find();
  }

  async findByMatricula(matricula: string): Promise<User | null> {
    return await userRepository.findOneBy({ matricula });
  }
}

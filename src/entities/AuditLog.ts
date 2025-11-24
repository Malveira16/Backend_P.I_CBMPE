import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity("audit_logs")
export class AuditLog {
  // ID único do log (auto-incremento)
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  // Quando aconteceu (com precisão de milissegundos)
  @CreateDateColumn({ type: "datetime" })
  @Index() // Índice para buscar por período
  timestamp!: Date;

  // ID único da requisição HTTP (rastrear chamadas relacionadas)
  @Column({ type: "varchar", length: 36 })
  @Index()
  request_id!: string;

  // Tipo de evento: 'user_management', 'http_request', 'auth', etc
  @Column({ type: "varchar", length: 50 })
  event_type!: string;

  // QUEM fez a ação (matrícula do usuário logado)
  @Column({ type: "varchar", length: 20, nullable: true })
  @Index() // Índice para buscar ações de um usuário
  actor_user_id?: string;

  // De qual IP veio a requisição (detectar acessos suspeitos)
  @Column({ type: "varchar", length: 45, nullable: true })
  actor_ip?: string;

  // Navegador/App usado (identificar origens)
  @Column({ type: "text", nullable: true })
  actor_user_agent?: string;

  // O QUE foi feito: 'create_user', 'delete_ocorrencia', etc
  @Column({ type: "varchar", length: 100 })
  action!: string;

  // ONDE foi feito: 'User', 'Ocorrencia', 'Perfil'
  @Column({ type: "varchar", length: 50 })
  @Index()
  resource!: string;

  // ID do recurso afetado (ex: matrícula do usuário criado)
  @Column({ type: "varchar", length: 100, nullable: true })
  resource_id?: string;

  // Resultado: 'success', 'failure' (400-499), 'error' (500+)
  @Column({ type: "enum", enum: ["success", "failure", "error"] })
  outcome!: "success" | "failure" | "error";

  // O que mudou (antes/depois) - senhas são automaticamente protegidas
  @Column({ type: "json", nullable: true })
  changes?: any;

  // Dados extras: tempo de processamento, status code, etc
  @Column({ type: "json", nullable: true })
  metadata?: any;

  // Hash SHA-256 do evento para garantir que não foi adulterado
  @Column({ type: "varchar", length: 64 })
  event_hash!: string;
}
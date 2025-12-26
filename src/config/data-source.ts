import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Perfil } from "../entities/Perfil";
import { UnidadeOperacional } from "../entities/UnidadeOperacional";
import { Regiao } from "../entities/Regiao";
import { AIS } from "../entities/AIS";
import { Equipe } from "../entities/Equipe";
import { EquipeUser } from "../entities/Equipe_User";
import { Telefone } from "../entities/Telefone";
import { Viatura } from "../entities/Viatura";
import { Ocorrencia } from "../entities/Ocorrencia";
import { Localizacao } from "../entities/Localizacao";
import { EventoEspecial } from "../entities/EventoEspecial";
import { NaturezaOcorrencia } from "../entities/NaturezaOcorrencia";
import { GrupoOcorrencia } from "../entities/GrupoOcorrencia";
import { SubgrupoOcorrencia } from "../entities/SubgrupoOcorrencia";
import { LogAuditoria } from "../entities/LogAuditoria";
import { Anexo } from "../entities/Anexo";
import { Vitima } from "../entities/Vitima";
import { Lesao } from "../entities/Lesao";
import { OcorrenciaUser } from "../entities/Ocorrencia_User";
import { LogConflito } from "../entities/LogConflito";
import { AuditLog } from "../entities/AuditLog";

dotenv.config();


const isProd = process.env.NODE_ENV === "production";
export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [
    User,
    Perfil,
    UnidadeOperacional,
    Regiao,
    AIS,
    Equipe,
    EquipeUser,
    Telefone,
    Viatura,
    Ocorrencia,
    Localizacao,
    EventoEspecial,
    NaturezaOcorrencia,
    GrupoOcorrencia,
    SubgrupoOcorrencia,
      LogAuditoria,
    Anexo,
    Vitima,
    Lesao,
    OcorrenciaUser,
    LogConflito,
      AuditLog,
  ],
  migrations: isProd ? [] : ["src/migrations/*.ts"],
  // Em desenvolvimento, permitimos que o TypeORM sincronize o schema
  // Isso cria tabelas faltantes como `audit_logs`. NÃO habilite em produção.
  synchronize: process.env.NODE_ENV !== 'production',
  migrationsRun: false,

  // Habilita logging em desenvolvimento para depuração de SQL
  logging: process.env.NODE_ENV !== 'production',
});

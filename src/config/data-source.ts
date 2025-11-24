import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource } from "typeorm";

import { User } from "./../entities/User";
import { Perfil } from "./../entities/Perfil";
import { UnidadeOperacional } from "../entities/UnidadeOperacional";
import { Regiao } from "../entities/Regiao";
import { AIS } from "../entities/AIS";
import { AuditLog } from "../entities/AuditLog"; 


dotenv.config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [User, Perfil, UnidadeOperacional, Regiao, AIS, AuditLog],
  synchronize: true, 
  logging: false,
});

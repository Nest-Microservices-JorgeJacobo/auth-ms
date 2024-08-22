import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { LoginUserDto, RegisterUserDto } from './dto';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { envs } from 'src/config';



@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit{
    
    private readonly logger = new Logger('AuthServices');
    

    constructor(
        private readonly jwtServices: JwtService
    ){
        super();
    }

    onModuleInit() {
        this.$connect();
        this.logger.log("Database Mongo connected");
    }

    async singJWT(payload: JwtPayload){
        return this.jwtServices.sign(payload);
    }


    async registerUser(registerUserDto: RegisterUserDto) {

        const {
            name,
            email,
            password
        } = registerUserDto;

        try {
            const user = await this.user.findUnique({
                where: {
                    email
                }
            });

            if(user) {
                throw new RpcException({
                    status: 400, 
                    message: 'User already exist.'
                });
            }

            const userCreate =await this.user.create({
                data: {
                    email: email,
                    name: name,
                    password: bcrypt.hashSync(password, 10) 
                }
            });

            const {password: ___, ...resUser} = userCreate;

            return {
                user: resUser,
                token: await this.singJWT(resUser)
            }
        } catch (error) {
            throw new RpcException({
                status: 400, 
                message: error.message
            });
        }
    }


    async loginUser(loginUser: LoginUserDto) {

        const {
            email,
            password
        } = loginUser;

        try {
            const user = await this.user.findUnique({
                where: {
                    email
                }
            });

            if(!user) {
                throw new RpcException({
                    status: 404, 
                    message: 'User/Password  not valid.'
                });
            }

            const isPasswordValid  = bcrypt.compareSync(password, user.password);

            if(!isPasswordValid){
                throw new RpcException({
                    status: 400, 
                    message: 'User/Password  not valid.'
                });
            }

           

            const {password: ___, ...resUser} = user;

            return {
                user: resUser,
                token: await this.singJWT(resUser)
            }
        } catch (error) {
            throw new RpcException({
                status: 400, 
                message: error.message
            });
        }
    }


    async verifyToken(token: string) {
        try {
            const {sub, iat, exp, ...user}  = this.jwtServices.verify(token,
                {
                     secret: envs.jwtSecret
                }
            );

            return {
                user,
                token: await this.singJWT(user)
            }



        } catch (error) {
            console.error(error);
            throw new RpcException({
                status: 401,
                message: "Invalid token"
            })
        }
      }
  


}

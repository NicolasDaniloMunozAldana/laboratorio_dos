import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SIRA - Sistema de Información y Recursos Administrativos',
      version: '1.0.0',
      description: `
        API completa para el Sistema de Información y Recursos Administrativos (SIRA).
        
        ##Características principales:
        - **Autenticación JWT**: Sistema seguro de tokens
        - **Control de acceso por roles**: Administrator y User
        - **Rate Limiting**: Protección contra ataques de fuerza bruta
        - **Recuperación de contraseña**: Sistema con códigos de 6 dígitos enviados por email
        - **Logs encriptados**: Seguimiento completo de actividades
        - **Bloqueo de cuentas**: Protección automática tras intentos fallidos
        
        ##Roles de usuario:
        - **Administrator**: Acceso completo a todos los endpoints
        - **User**: Acceso limitado solo a su información personal
        
        ##Seguridad:
        - Tokens JWT con expiración de 24 horas
        - Encriptación de contraseñas con bcrypt
        - Logs encriptados con AES-256-CBC
        - Rate limiting en endpoints críticos
        - Bloqueo temporal tras 5 intentos fallidos de login
      `,
      contact: {
        name: 'Equipo de Desarrollo SIRA',
        email: 'munozaldananicolas@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://sira-prod.herokuapp.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido del endpoint de login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'username', 'email', 'role'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario',
              example: 1
            },
            username: {
              type: 'string',
              description: 'Nombre de usuario único',
              example: 'admin'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Dirección de email del usuario',
              example: 'admin@sistema.com'
            },
            role: {
              type: 'string',
              enum: ['administrator', 'user'],
              description: 'Rol del usuario en el sistema',
              example: 'administrator'
            },
            isBlocked: {
              type: 'boolean',
              description: 'Estado de bloqueo del usuario',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del usuario',
              example: '2023-01-01T00:00:00.000Z'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: {
              type: 'string',
              description: 'Username o email del usuario',
              example: 'admin'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Contraseña del usuario',
              example: 'admin123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Login successful'
            },
            token: {
              type: 'string',
              description: 'Token JWT para autenticación',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        ResetCodeRequest: {
          type: 'object',
          required: ['username'],
          properties: {
            username: {
              type: 'string',
              description: 'Nombre de usuario para recuperar contraseña',
              example: 'admin'
            }
          }
        },
        VerifyCodeRequest: {
          type: 'object',
          required: ['username', 'code'],
          properties: {
            username: {
              type: 'string',
              description: 'Nombre de usuario',
              example: 'admin'
            },
            code: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: 'Código de 6 dígitos enviado por email',
              example: '123456'
            }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['username', 'code', 'newPassword'],
          properties: {
            username: {
              type: 'string',
              description: 'Nombre de usuario',
              example: 'admin'
            },
            code: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: 'Código de verificación de 6 dígitos',
              example: '123456'
            },
            newPassword: {
              type: 'string',
              format: 'password',
              minLength: 6,
              description: 'Nueva contraseña (mínimo 6 caracteres, debe contener al menos una letra y un número)',
              example: 'newPassword123'
            }
          }
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Nuevo nombre de usuario',
              example: 'newUsername'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Nuevo email',
              example: 'newemail@sistema.com'
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 6,
              description: 'Nueva contraseña (opcional)',
              example: 'newPassword123'
            }
          }
        },
        LogEntry: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp del evento',
              example: '2023-01-01T12:00:00.000Z'
            },
            level: {
              type: 'string',
              enum: ['INFO', 'WARN', 'ERROR'],
              description: 'Nivel de severidad del log',
              example: 'INFO'
            },
            user: {
              type: 'string',
              description: 'Usuario que realizó la acción',
              example: 'admin'
            },
            action: {
              type: 'string',
              description: 'Descripción de la acción realizada',
              example: 'Successful login'
            },
            ip: {
              type: 'string',
              description: 'Dirección IP del cliente',
              example: '192.168.1.1'
            },
            userAgent: {
              type: 'string',
              description: 'User Agent del cliente',
              example: 'Mozilla/5.0...'
            }
          }
        },
        SystemStats: {
          type: 'object',
          properties: {
            totalUsers: {
              type: 'integer',
              description: 'Total de usuarios en el sistema',
              example: 4
            },
            usersByRole: {
              type: 'object',
              description: 'Usuarios agrupados por rol',
              example: {
                administrator: 1,
                user: 3
              }
            },
            blockedUsers: {
              type: 'integer',
              description: 'Número de usuarios bloqueados',
              example: 0
            },
            recentActivity: {
              type: 'object',
              properties: {
                totalLogs: {
                  type: 'integer',
                  description: 'Total de logs recientes',
                  example: 150
                },
                logsByLevel: {
                  type: 'object',
                  description: 'Logs agrupados por nivel',
                  example: {
                    INFO: 120,
                    WARN: 25,
                    ERROR: 5
                  }
                },
                recentLogins: {
                  type: 'integer',
                  description: 'Logins exitosos recientes',
                  example: 45
                },
                failedLogins: {
                  type: 'integer',
                  description: 'Intentos de login fallidos recientes',
                  example: 12
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de error',
              example: 'Invalid credentials'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de error de validación',
              example: 'Password must be at least 6 characters long'
            }
          }
        },
        BlockedAccountError: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de cuenta bloqueada',
              example: 'Account temporarily blocked. Try again in 15 minutes.'
            },
            blockedUntil: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha hasta cuándo está bloqueada la cuenta',
              example: '2023-01-01T12:15:00.000Z'
            },
            remainingMinutes: {
              type: 'integer',
              description: 'Minutos restantes de bloqueo',
              example: 15
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints relacionados con autenticación y autorización'
      },
      {
        name: 'Password Recovery',
        description: 'Endpoints para recuperación de contraseña con códigos'
      },
      {
        name: 'Users',
        description: 'Gestión de usuarios (requiere autenticación)'
      },
      {
        name: 'Admin',
        description: 'Endpoints exclusivos para administradores'
      }
    ]
  },
  apis: ['./src/routes/*.js'],
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };

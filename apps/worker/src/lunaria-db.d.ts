declare module '@lunaria/db' {
  export const prisma: any;
  export function createAuditLog(input: any): Promise<any>;
}

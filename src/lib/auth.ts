import { getServerSession } from "next-auth";
import { authOptions as baseAuthOptions } from "@/lib/auth/auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions = {
    ...baseAuthOptions,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                phone: { label: "Phone", type: "text" },
                address: { label: "Address", type: "text" },
            },

            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) return null;

                const valid = await bcrypt.compare(credentials.password, user.password);

                if (!valid) return null;

                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role ?? "user",
                };
            },
        }),
    ],
};

export const auth = () => getServerSession(authOptions);

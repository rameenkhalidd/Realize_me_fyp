import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
    .object({
        displayName: z
            .string()
            .trim()
            .min(1, 'Name is required')
            .max(80, 'Name must be 80 characters or fewer'),
        email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
        password: z.string().min(8, 'Use at least 8 characters').max(128, 'Password is too long'),
        confirmPassword: z.string().min(1, 'Confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export type SignupFormValues = z.infer<typeof signupSchema>;

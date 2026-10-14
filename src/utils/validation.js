import { z } from 'zod';
export const passwordSchema=z.string().min(12,'Le mot de passe doit contenir au moins 12 caractères.').max(200);
export const uuidSchema=z.string().uuid('Identifiant invalide.');

import Stripe from 'stripe';
import { config } from '../config.js';
let stripe=null;
export function stripeClient(){ if(!config.stripe.secretKey||!config.stripe.webhookSecret) return null; if(!stripe) stripe=new Stripe(config.stripe.secretKey); return stripe; }
export function stripeConfigured(){return !!(config.stripe.secretKey&&config.stripe.webhookSecret)}

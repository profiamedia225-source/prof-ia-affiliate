-- Ajout des colonnes financières au profil

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS balance numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_commissions numeric(12,2) NOT NULL DEFAULT 0;

-- Contraintes de sécurité

ALTER TABLE public.products
ALTER COLUMN product_name SET NOT NULL;

ALTER TABLE public.products
ALTER COLUMN price SET NOT NULL;

ALTER TABLE public.products
ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.products
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.orders
ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_user
ON public.orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_affiliate
ON public.orders(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_orders_reference
ON public.orders(order_reference);

CREATE INDEX IF NOT EXISTS idx_profiles_affiliate_code
ON public.profiles(affiliate_code);

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_email TEXT;
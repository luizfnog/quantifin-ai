-- Add parent_id to categories table to support hierarchy
ALTER TABLE public.categories 
ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

-- Add subcategory_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Update default categories function to create hierarchical structure
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  habitacao_id uuid;
  alimentacao_id uuid;
  transporte_id uuid;
  saude_id uuid;
  lazer_id uuid;
  educacao_id uuid;
BEGIN
  -- Insert parent categories
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Habitação', '#8b5cf6', '🏠', NULL) RETURNING id INTO habitacao_id;
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Alimentação', '#ef4444', '🍔', NULL) RETURNING id INTO alimentacao_id;
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Transporte', '#3b82f6', '🚗', NULL) RETURNING id INTO transporte_id;
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Saúde', '#10b981', '💊', NULL) RETURNING id INTO saude_id;
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Lazer', '#f59e0b', '🎮', NULL) RETURNING id INTO lazer_id;
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Educação', '#06b6d4', '📚', NULL) RETURNING id INTO educacao_id;
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Renda', '#22c55e', '💰', NULL);
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Outros', '#6b7280', '📦', NULL);

  -- Insert subcategories for Habitação
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Aluguel/Financiamento', '#8b5cf6', '🔑', habitacao_id),
    (NEW.id, 'Conta de Luz', '#8b5cf6', '💡', habitacao_id),
    (NEW.id, 'Conta de Água', '#8b5cf6', '💧', habitacao_id),
    (NEW.id, 'Internet', '#8b5cf6', '📡', habitacao_id),
    (NEW.id, 'IPTU/Condomínio', '#8b5cf6', '🏢', habitacao_id);

  -- Insert subcategories for Alimentação
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Supermercado', '#ef4444', '🛒', alimentacao_id),
    (NEW.id, 'Restaurante', '#ef4444', '🍽️', alimentacao_id),
    (NEW.id, 'Delivery', '#ef4444', '📦', alimentacao_id);

  -- Insert subcategories for Transporte
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Combustível', '#3b82f6', '⛽', transporte_id),
    (NEW.id, 'Transporte Público', '#3b82f6', '🚌', transporte_id),
    (NEW.id, 'Manutenção Veículo', '#3b82f6', '🔧', transporte_id);

  -- Insert subcategories for Saúde
  INSERT INTO public.categories (user_id, name, color, icon, parent_id) VALUES
    (NEW.id, 'Farmácia', '#10b981', '💊', saude_id),
    (NEW.id, 'Consultas Médicas', '#10b981', '👨‍⚕️', saude_id),
    (NEW.id, 'Plano de Saúde', '#10b981', '🏥', saude_id);

  RETURN NEW;
END;
$function$;
-- Create RPC to compute accumulated balance per authenticated user
CREATE OR REPLACE FUNCTION public.get_accumulated_balance()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN type = 'income' THEN amount
        WHEN type = 'expense' THEN -amount
        ELSE 0
      END
    ), 0
  )::numeric
  FROM public.transactions
  WHERE user_id = auth.uid();
$$;
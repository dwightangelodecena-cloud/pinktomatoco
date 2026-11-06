-- Checkout charges the listed variant price. Quantity no longer changes the unit price.
create or replace function public.create_order(p_email text, p_full_name text, p_address jsonb, p_items jsonb)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare
  v_order_id bigint;
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_unit numeric;
  v_subtotal numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  insert into orders (user_id, email, full_name, address, subtotal)
  values (auth.uid(), p_email, p_full_name, p_address, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 then raise exception 'Invalid quantity'; end if;

    select v.id, v.label, v.price, p.id as product_id, p.name
      into v_variant
      from product_variants v join products p on p.id = v.product_id
     where v.id = (v_item->>'variant_id')::int and p.is_visible;
    if not found then raise exception 'Unknown product option'; end if;

    v_unit := v_variant.price;
    v_subtotal := v_subtotal + v_unit * v_qty;

    insert into order_items (order_id, product_id, variant_id, name, option_label, quantity, unit_price)
    values (v_order_id, v_variant.product_id, v_variant.id, v_variant.name, v_variant.label, v_qty, v_unit);
  end loop;

  update orders set subtotal = v_subtotal where id = v_order_id;
  return v_order_id;
end;
$fn$;

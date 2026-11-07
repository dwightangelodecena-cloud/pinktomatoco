// Figures worked out from the order list. Cancelled orders never count.
const active = (orders) => orders.filter((o) => o.status !== 'cancelled');
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// One entry per calendar day, oldest first, including days with no orders.
export function dailyTotals(orders, days) {
  const today = new Date();
  const buckets = [];
  const byDay = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const bucket = { date, value: 0, orders: 0 };
    buckets.push(bucket);
    byDay.set(dayKey(date), bucket);
  }
  for (const o of active(orders)) {
    const bucket = byDay.get(dayKey(new Date(o.created_at)));
    if (bucket) {
      bucket.value += Number(o.subtotal);
      bucket.orders += 1;
    }
  }
  return buckets;
}

export function ordersSince(orders, date) {
  return active(orders).filter((o) => new Date(o.created_at) >= date);
}

export function topProducts(orders, limit = 5) {
  const totals = new Map();
  for (const o of orders) {
    for (const i of o.order_items || []) {
      const row = totals.get(i.name) || { name: i.name, units: 0, value: 0 };
      row.units += i.quantity;
      row.value += i.quantity * Number(i.unit_price);
      totals.set(i.name, row);
    }
  }
  return [...totals.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

// Customers are matched by email, so guest and signed-in orders are grouped together.
export function customersFrom(orders) {
  const people = new Map();
  for (const o of orders) {
    const key = o.email.trim().toLowerCase();
    const person = people.get(key) || { email: o.email, name: o.full_name, orders: 0, spent: 0, lastOrder: o.created_at };
    person.orders += 1;
    if (o.status !== 'cancelled') person.spent += Number(o.subtotal);
    if (o.created_at >= person.lastOrder) {
      person.lastOrder = o.created_at;
      person.name = o.full_name;
    }
    people.set(key, person);
  }
  return [...people.values()].sort((a, b) => b.spent - a.spent);
}

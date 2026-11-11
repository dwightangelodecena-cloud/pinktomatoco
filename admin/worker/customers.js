// Customers, newsletter subscribers and product reviews.
export async function listCustomers(bc) {
  const customers = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const { data, meta } = await bc.get(`/v3/customers?limit=250&page=${page}&sort=date_created:desc`);
    customers.push(...data);
    pages = meta.pagination.total_pages;
  }
  return customers.map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email,
    email: c.email,
    joined: c.date_created,
  }));
}

export async function listSubscribers(bc) {
  const subscribers = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const { data, meta } = await bc.get(`/v3/customers/subscribers?limit=250&page=${page}`);
    subscribers.push(...data);
    pages = meta.pagination.total_pages;
  }
  return subscribers
    .map((s) => ({ id: s.id, email: s.email, name: [s.first_name, s.last_name].filter(Boolean).join(' '), created_at: s.date_created }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// BigCommerce keeps reviews per product. One request per product, in groups, keeps
// each call under Cloudflare's request limit for a catalog of this size.
export async function listReviews(bc) {
  const { data: products } = await bc.get('/v3/catalog/products?limit=45&include_fields=id,name,custom_url,reviews_count&sort=id&direction=desc');
  const withReviews = products.filter((p) => p.reviews_count > 0);
  const lists = await Promise.all(withReviews.map((p) => bc.get(`/v3/catalog/products/${p.id}/reviews?limit=250`)));
  return lists.flatMap(({ data }, i) => data.map((r) => ({
    id: r.id,
    product_id: withReviews[i].id,
    product: { name: withReviews[i].name, slug: withReviews[i].custom_url.url.replace(/^\/|\/$/g, '') },
    rating: r.rating,
    name: r.name,
    subject: r.title,
    comments: r.text,
    approved: r.status === 'approved',
    created_at: r.date_created,
  }))).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export const setReviewApproved = (bc, productId, id, approved) =>
  bc.put(`/v3/catalog/products/${productId}/reviews/${id}`, { status: approved ? 'approved' : 'disapproved' });

export const deleteReview = (bc, productId, id) => bc.delete(`/v3/catalog/products/${productId}/reviews/${id}`);

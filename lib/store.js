// In-memory store for serverless (use a DB like Supabase/PlanetScale for production)
// For production, replace this with your preferred database client

let visitors = [];

export function getVisitors() {
  return visitors;
}

export function addVisitor(visitor) {
  visitors = [visitor, ...visitors];
  return visitor;
}

export function updateVisitor(id, updates) {
  visitors = visitors.map((v) => (v.id === id ? { ...v, ...updates } : v));
  return visitors.find((v) => v.id === id);
}

export function getVisitorById(id) {
  return visitors.find((v) => v.id === id);
}

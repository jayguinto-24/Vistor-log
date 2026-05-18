import { updateVisitor, getVisitorById } from '../../../lib/store';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const existing = getVisitorById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Visitor not found.' });
    }

    const updated = updateVisitor(id, {
      checkOut: req.body.checkOut || new Date().toISOString(),
    });

    return res.status(200).json(updated);
  }

  res.setHeader('Allow', ['PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

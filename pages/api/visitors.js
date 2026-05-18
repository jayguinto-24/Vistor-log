import { v4 as uuidv4 } from 'uuid';
import { getVisitors, addVisitor } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const visitors = getVisitors();
    return res.status(200).json(visitors);
  }

  if (req.method === 'POST') {
    const { name, surname, company, checkIn, visitingWhom } = req.body;

    if (!name || !surname || !visitingWhom) {
      return res.status(400).json({ error: 'Name, surname, and visiting whom are required.' });
    }

    const visitor = {
      id: uuidv4(),
      name,
      surname,
      company: company || '',
      checkIn: checkIn || new Date().toISOString(),
      checkOut: null,
      visitingWhom,
      createdAt: new Date().toISOString(),
    };

    addVisitor(visitor);
    return res.status(201).json(visitor);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

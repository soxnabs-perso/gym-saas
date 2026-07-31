import jwt from 'jsonwebtoken';

function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = decoded.sub;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
}

export { protect };

import 'dotenv/config';

import createApp from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

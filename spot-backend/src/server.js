import app from './app.js';
import config from './shared/config/env.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 SPOT Backend running on http://localhost:${PORT}`);
});

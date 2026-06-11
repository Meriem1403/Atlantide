import app from './app.js';
import { APP_NAME } from './config/branding.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API ${APP_NAME} sur http://0.0.0.0:${PORT}/api`);
});

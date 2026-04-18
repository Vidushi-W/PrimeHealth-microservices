require('dotenv').config();

const app = require('./app');

const port = Number(process.env.PORT) || 5008;

app.listen(port, () => {
  console.log(`notification-service listening on port ${port}`);
});

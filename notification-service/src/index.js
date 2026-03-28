const express = require('express');
const app = express();
const port = 3004;

app.get('/', (req, res) => {
  res.send('Notification Service is running');
});

app.listen(port, () => {
  console.log(`Notification Service listening at http://localhost:${port}`);
});

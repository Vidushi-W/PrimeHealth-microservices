const express = require('express');
const app = express();
const port = 3003;

app.get('/', (req, res) => {
  res.send('Appointment Service is running');
});

app.listen(port, () => {
  console.log(`Appointment Service listening at http://localhost:${port}`);
});

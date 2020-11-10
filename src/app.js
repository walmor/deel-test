const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const httpErrors = require('http-errors');
require('express-async-errors');

const { getProfile } = require('./middleware/getProfile');

const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id } = req.params;
  const contract = await Contract.findOne({ where: { id } });
  if (!contract) return res.status(404).end();
  res.json(contract);
});

// error handler for better error payloads.
app.use((err, req, res, next) => {
  if (httpErrors.isHttpError(err)) {
    res.status(err.statusCode);

    if (typeof err.message === 'string') {
      res.json({ message: err.message });
    } else {
      res.json({ ...err.message });
    }
  } else {
    next(err);
  }
});

module.exports = app;

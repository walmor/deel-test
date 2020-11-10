const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const httpErrors = require('http-errors');
require('express-async-errors');

const { getProfile } = require('./middleware/getProfile');
const service = require('./service');

const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

/**
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
  const { id: contractId } = req.params;
  const { id: userId } = req.profile;

  const contract = await service.getContractById({ contractId, userId });

  res.json(contract);
});

/**
 * @returns contracts
 */
app.get('/contracts', getProfile, async (req, res) => {
  const { id: userId } = req.profile;

  const contract = await service.getActiveContracts({ userId });

  res.json(contract);
});

/**
 * @returns unpaid jobs
 */
app.get('/jobs/unpaid', getProfile, async (req, res) => {
  const { id: userId } = req.profile;

  const unpaidJobs = await service.getUnpaidJobs({ userId });

  res.json(unpaidJobs);
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

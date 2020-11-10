const err = require('http-errors');

const ContractNotFound = (id) =>
  new err.NotFound({ code: 'contract-not-found', message: `No contract found with id ${id}.` });

module.exports = {
  ContractNotFound,
};

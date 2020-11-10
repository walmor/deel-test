const err = require('http-errors');

const AccessDenied = () =>
  new err.Forbidden({ code: 'access-denied', message: 'You do not have access to this resource or operation.' });

const InternalError = () =>
  new err.InternalServerError({ code: 'internal-error', message: 'An unknown error has ocurred.' });

const ContractNotFound = (id) =>
  new err.NotFound({ code: 'contract-not-found', message: `No contract found with id ${id}.` });

const JobNotFound = (id) => new err.NotFound({ code: 'job-not-found', message: `No job found with id ${id}.` });

const JobAlreadyPaid = () => new err.BadRequest({ code: 'job-already-paid', message: 'This job is already paid.' });

const TerminatedContract = () =>
  new err.BadRequest({ code: 'contract-terminated', message: "The job's contract is terminated." });

const NotEnoughBalance = () =>
  new err.BadRequest({ code: 'not-enough-balance', message: 'Not enough balance to pay for this job.' });

const isHttpError = err.isHttpError;

module.exports = {
  AccessDenied,
  InternalError,
  ContractNotFound,
  JobNotFound,
  JobAlreadyPaid,
  TerminatedContract,
  NotEnoughBalance,
  isHttpError,
};
